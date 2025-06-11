<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'telefone' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $digits = preg_replace('/\D/', '', $value);
                    if (strlen($digits) < 10 || strlen($digits) > 11) {
                        $fail('O telefone deve conter 10 ou 11 dígitos.');
                    }
                },
                'unique:users,telefone'
            ],
            'cpf' => [
                'required',
                'string',
                'regex:/^\d{11}$/',
                'unique:users,cpf'
            ],
        ], [
            'telefone.unique' => 'Já existe um usuário com esse telefone.',
            'cpf.unique' => 'Já existe um usuário com esse CPF.',
        ]);

        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => $request->name,
                'telefone' => preg_replace('/\D/', '', $request->telefone),
                'cpf' => $request->cpf,
                'role' => 'cliente',
                'password' => null,
                'email' => null,
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            DB::commit();

            return response()->json([
                'message' => 'Usuário registrado com sucesso!',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'cpf' => $user->cpf,
                    'telefone' => $user->telefone,
                ],
                'token' => $token,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erro ao registrar usuário:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao registrar usuário: ' . $e->getMessage()], 500);
        }
    }

    public function login(Request $request)
    {
        $request->validate([
            'credential' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $digits = preg_replace('/\D/', '', $value);
                    if (strlen($digits) !== 11 && (strlen($digits) < 10 || strlen($digits) > 11)) {
                        $fail('A credencial deve ser um CPF (11 dígitos) ou telefone (10-11 dígitos).');
                    }
                },
            ],
        ]);

        try {
            $user = User::where('telefone', preg_replace('/\D/', '', $request->credential))
                        ->orWhere('cpf', $request->credential)
                        ->first();

            if (!$user) {
                return response()->json(['message' => 'Credenciais inválidas'], 401);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login realizado com sucesso!',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'cpf' => $user->cpf,
                    'telefone' => $user->telefone,
                ],
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao fazer login:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao fazer login: ' . $e->getMessage()], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $request->user()->tokens()->delete();
            return response()->json(['message' => 'Logout realizado com sucesso']);
        } catch (\Exception $e) {
            Log::error('Erro ao fazer logout:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erro ao fazer logout: ' . $e->getMessage()], 500);
        }
    }

    public function me()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'cpf' => $user->cpf,
            'telefone' => $user->telefone,
        ]);
    }
}