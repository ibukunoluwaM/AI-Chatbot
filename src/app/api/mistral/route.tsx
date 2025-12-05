import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Step 1: Get messages from frontend
  const { messages } = await req.json();

  // Step 2: Call Mistral safely
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages 
    })
  });

  // Step 3: Get Mistral response
  const data = await res.json();

  // Step 4: Return response to frontend
  return NextResponse.json(data);
}
