<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;

use App\Models\Feedback;
use Illuminate\Http\Request;

class AdminFeedbackController extends Controller
{
    public function index()
    {
        $feedbacks = Feedback::with('user')->get();
        return response()->json($feedbacks);
    }

    public function approve($id)
    {
        $feedback = Feedback::with('user')->findOrFail($id); // Load user relationship
        $feedback->update(['status' => 'approved']);
        return response()->json($feedback);
    }
}