"use client";
import { Box, Flex, useMediaQuery} from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";
import ChatInput from "@/components/ui/chatInput";
import Sidebar from "@/components/ui/sidebar";
import MessagePart from "@/components/ui/messages";

//interfaces
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
}

export default function Home() {
  //users message from input
  const [userMsg, setUserMsg] = useState("");

  //message thread
  const [thread, setThread] = useState<Thread[]>(() => {
    const id = Date.now().toString();
    return [
      {
        id,
        title: "New Chat",
        messages: [],
      },
    ];
  });

  //ai response loading
  const [loading, setLoading] = useState(false);

  //api error
  const [error, setError] = useState("");

  //selectedMessage index
  const [selectedThreadIndex, setSelectedThreadIndex] = useState<number>(0);

  //highlighted conversation using selecetdIndex
  const currentThread = thread[selectedThreadIndex];

  //is the user's screen large/small???
  const [isSmallScreen] = useMediaQuery(["(max-width: 800px)"]);

  //side bar open/close
  const [isOpen, setIsOpen] = useState(false);

  //handles scrolling
  const bottomRef = useRef<HTMLDivElement>(null);

  //saves last message; for onError retry button
  const [lastMsg, setLastMsg] = useState<string>("");

  //for localStorage; get from the localStorage
  useEffect(() => {
    const savedThreads = localStorage.getItem("chat_threads");

    if (savedThreads) {
      setThread(JSON.parse(savedThreads));
    }
  }, []);

  //Save threads whenever updated
  useEffect(() => {
    localStorage.setItem("chat_threads", JSON.stringify(thread));
  }, [thread]);

  // 3. Save selected thread index whenever changed
  useEffect(() => {
    localStorage.setItem(
      "selected_thread",
      JSON.stringify(selectedThreadIndex)
    );
  }, [selectedThreadIndex]);
  //scrolls to the recent message received in the conversation
  useEffect(
    function () {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({
          behavior: "smooth",
        });
      }
    },
    [currentThread.messages]
  );

  //handles opening sidebar
  function OpenSideBar() {
    setIsOpen(!isOpen);
  }

  //handles closing sidebar
  function closeSideBar() {
    setIsOpen(false);
  }

  //frontend to server

  async function sendToMistral(messages: Message[]) {
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

  //generates title from message
  async function generateTitleFromMessage(message: string) {
    try {
      const res = await fetch("/api/mistral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Summarize this message in 3–5 words suitable as a chat title: ${message}`,
            },
          ],
        }),
      });
      let data = await res.json();
      data = data?.choices?.[0]?.message?.content || "New Chat";
      data = data.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
      return data;
    } catch {
      return "New Chat";
    }
  }

  //handles new chat
  function createNewChat() {
    const id = crypto.randomUUID().toString();
    const newThread: Thread = {
      id,
      title: "New Chat",
      messages: [],
    };

    setThread((prev) => {
      const updated = [newThread, ...prev];
      // now we know the exact index of the new thread
      setSelectedThreadIndex(0);
      return updated;
    });
    closeSideBar();
  }

  async function handleSendMessage() {
    if (!userMsg.trim()) return; // ignore empty messages

    // 1️⃣ Create the user message object
    const userMsgObj: Message = {
      role: "user",
      content: userMsg,
    };

    // 2️⃣ Clear input immediately
    setUserMsg("");

    // 3️⃣ Prepare the updated messages array
    const currentMessages = [...currentThread.messages, userMsgObj];

    // 4️⃣ Generate title if this is the first message
    let title = currentThread.title;
    if (currentThread.messages.length === 0) {
      try {
        title = await generateTitleFromMessage(userMsg);
      } catch {
        title = "New Chat"; // fallback title
      }
    }

    // 5️⃣ Update the thread state with user message and title
    setThread((prev) => {
      const updated = [...prev];
      updated[selectedThreadIndex] = {
        ...updated[selectedThreadIndex],
        messages: currentMessages,
        title,
      };
      return updated;
    });

    // 6️⃣ Send to AI
    let data;
    try {
      data = await sendToMistral(currentMessages);
    } catch {
      data = null;
    }

    // 7️⃣ Create AI message object (or error message)
    const aiResponse: Message = {
      role: "assistant",
      content:
        data?.choices?.[0]?.message?.content ||
        "Sorry, I could not process your request. Please try again.",
    };

    // 8️⃣ Update thread with AI response
    setThread((prev) => {
      const updated = [...prev];
      updated[selectedThreadIndex] = {
        ...updated[selectedThreadIndex],
        messages: [...updated[selectedThreadIndex].messages, aiResponse],
      };
      return updated;
    });
  }

  //handles a rerun of the user's message incase of error
  async function retrySendMessage() {
    if (!lastMsg.trim()) return; // ignore empty messages

    // 1. create user message object
    const userMsgObj: Message = {
      // id: crypto.randomUUID(),
      role: "user",
      content: lastMsg,
    };

    // 2. update thread immediately
    setThread((prev) => {
      const updated = [...prev];
      updated[selectedThreadIndex] = {
        ...updated[selectedThreadIndex],
        messages: [...updated[selectedThreadIndex].messages, userMsgObj],
      };
      return updated;
    });

    // 3. saves last message, for a retry incase of error
    setError("");

    // 4. send to Mistral with the correct updated array
    const messagesToSend = [...currentThread.messages, userMsgObj]; // include new message
    const data = await sendToMistral(messagesToSend);

    //handles error incase data
    if (!data) {
      // push an AI error message instead of normal content
      setError("An unexpected error occurred, please try again.");

      return;
    }

    // 6. create AI message object
    const aiResponse: Message = {
      // id: crypto.randomUUID(),
      role: "assistant",
      content: data?.choices?.[0]?.message?.content,
      // updatedAt: new Date().toISOString(),
    };

    // 7. update thread with AI response
    setThread((prev) => {
      const updated = [...prev];
      updated[selectedThreadIndex] = {
        ...updated[selectedThreadIndex],
        messages: [...updated[selectedThreadIndex].messages, aiResponse],
      };
      return updated;
    });
  }

  //handles deleting a thread
  function deleteThread(id: string) {
    if (thread.length === 1) {
      return;
    }
    setThread((prev) => {
      const updated = prev.filter((t) => t.id !== id);

      // If the deleted thread was the currently selected one,
      // fallback to the first thread
      if (selectedThreadIndex >= updated.length) {
        setSelectedThreadIndex(0);
      }

      return updated;
    });
  }

  return (
    <Flex
      direction={isSmallScreen ? "" : "row-reverse"}
      justify="space-between"
      userSelect="text"
      h="100vh"
      bg="#1a1a1a"
    >
      {/* contains the message */}
      <Flex
        flex="1"
        position="relative"
        direction="column"
        width="100%"
        userSelect="text"
        minH="0"
      >
        <Box
          flex="1"
          overflowY={currentThread.messages.length === 0 ? "hidden" : "auto"}
          p="4"
          width="100%"
          // maxWidth={isSmallScreen ? "100%" : "100%"}
          height="100%"
          mx={isSmallScreen ? "none" : "auto"}
        >
          {/* menu */}
          {isSmallScreen && (
            <Box
              cursor="pointer"
              onClick={OpenSideBar}
              position="fixed"
              top="1rem"
              left="1rem"
              padding="0.5rem 1rem"
              borderRadius="12px"
            >
              ☰
            </Box>
          )}

          {/* message side */}
          <MessagePart
            closeSideBar={closeSideBar}
            currentThread={currentThread}
            bottomRef={bottomRef}
            loading={loading}
            error={error}
            retrySendMessage={retrySendMessage}
          />
        </Box>

        <ChatInput
          userMsg={userMsg}
          setUserMsg={setUserMsg}
          handleSendMessage={handleSendMessage}
        />

        {isSmallScreen
          ? isOpen && (
              <Box
                position="fixed"
                top="0"
                left="0"
                width="100%" // Same width as your sidebar
                height="100vh"
                backdropFilter="blur(4px)"
                bg="rgba(255,255,255,0.2)"
                zIndex={isSmallScreen ? "3" : ""}
              />
            )
          : ""}
      </Flex>

      {/*side bar*/}
      <Sidebar
        isSmallScreen={isSmallScreen}
        isOpen={isOpen}
        createNewChat={createNewChat}
        closeSideBar={closeSideBar}
        thread={thread}
        setSelectedThreadIndex={setSelectedThreadIndex}
        deleteThread={deleteThread}
      />
    </Flex>
  );
}
