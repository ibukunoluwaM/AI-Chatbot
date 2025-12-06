import React from "react";
import { Message } from "@/app/page";

interface SendToMistralOptions {
  setLoading: (loading: boolean) => void;
  setError: (msg: string) => void;
}

async function sendToMistral(
  messages: Message[],
  options: SendToMistralOptions
) {
  const { setLoading, setError } = options;

  setLoading(true); // loading spinner state
  setError("");

  //stop
  try {
    const res = await fetch("/api/mistral", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    console.log("AI response:", data);

    return data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      // setError(err.message);
    } else {
      setError("An unexpected error occurred");
    }
  } finally {
    setLoading(false);
  }
}

export default sendToMistral;
