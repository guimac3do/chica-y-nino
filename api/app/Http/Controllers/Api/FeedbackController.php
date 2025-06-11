<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FeedbackController extends Controller
{
    public function index()
    {
        $feedbacks = Feedback::where('status', 'approved')->with('user')->get();
        return response()->json($feedbacks);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        if (Feedback::where('user_id', $user->id)->exists()) {
            return response()->json(['error' => 'You have already submitted feedback'], 403);
        }

        $request->validate(['content' => 'required|string|max:1000']);
        $feedback = Feedback::create([
            'user_id' => $user->id,
            'content' => $request->content,
            'status' => 'pending',
        ]);

        return response()->json($feedback, 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        $feedback = Feedback::where('user_id', $user->id)->findOrFail($id);

        $request->validate(['content' => 'required|string|max:1000']);
        $feedback->update([
            'content' => $request->content,
            'status' => 'pending',
        ]);

        return response()->json($feedback);
    }

    public function showUserFeedback()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        $feedback = Feedback::where('user_id', $user->id)->first();
        return response()->json($feedback);
    }
}