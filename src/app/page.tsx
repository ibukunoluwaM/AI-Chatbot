"use client";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  VStack,
  ListItem,
  List,
  Textarea,
  useMediaQuery,
  Avatar,
  Spinner,
} from "@chakra-ui/react";
import { JSX, useState, useRef, useEffect } from "react";
import Image from "next/image";

//interfaces
interface Message {
  // id: string;
  role: "user" | "assistant";
  content: string;
  // createdAt: string;
  // updatedAt?: string;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  // createdAt?: string;
  // updatedAt?: string;
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
  const [isLargeScreen] = useMediaQuery(["(max-width: 800px)"]);

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

    try {
      const res = await fetch("/api/mistral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      }).finally(() => {
        setLoading(false);
      });
      const data = await res.json();
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
  // function createTitleFromMessage(text: string) {
  //   // remove emojis, extra spaces
  //   text = text
  //     .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
  //     .trim();

  //   // If text is too long, shorten it
  //   if (text.length > 30) {
  //     text = text.slice(0, 30) + "...";
  //   }

  //   // Capitalize first letter
  //   return text.charAt(0).toUpperCase() + text.slice(1);
  // }

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

  //handles sending and receiving messages
  async function handleSendMessage() {
    if (!userMsg.trim()) return; // ignore empty messages

    // 1. create user message object
    const userMsgObj: Message = {
      // id: crypto.randomUUID(),
      role: "user",
      content: userMsg,
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
    setLastMsg(userMsg);

    // 4. clear input
    setUserMsg("");

    //5. generating title
    //If this is the FIRST message, generate a title
    if (currentThread.messages.length === 0) {
      const title = await generateTitleFromMessage(userMsg);
      setThread((prev) => {
        const updated = [...prev];
        updated[selectedThreadIndex] = {
          ...updated[selectedThreadIndex],
          title,
        };
        return updated;
      });
    }

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
      direction={isLargeScreen ? "" : "row-reverse"}
      justify="space-between"
      userSelect="text"
    >

      {/* contains the message */}
      <Flex
        flex="1"
        position="relative"
        direction="column"
        h="100vh"
        width = {isLargeScreen ? "100vw" : "90%"}
        userSelect="text"
      >
        <Box
          flex="1"
          overflowY={currentThread.messages.length === 0 ? "hidden" : "auto"}
          p="4"
          bg="gray.50"
          width={isLargeScreen ? "100%" : "90%"}
          mx={isLargeScreen ? "none" : "auto"}
        >
          {/* menu */}
          {isLargeScreen && (
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
          <VStack
            align="stretch"
            gap="3"
            onClick={closeSideBar}
            
            //             onClick={(e) => {
            //   // Only close if clicking the VStack itself, not children
            //   if (e.target === e.currentTarget) {
            //     closeSideBar();
            //   }
            // }}
            userSelect="text"
          >
            {currentThread.messages.length === 0 ? (
              <Flex width="100%" align="center" justify="center" height="100vh">
                <Box fontSize="2rem" textAlign="center" zIndex={10}>
                  Hello, how may I help you today?
                </Box>
              </Flex>
            ) : (
              currentThread.messages.map((m, i): JSX.Element => {
                return (
                  <Flex
                    key={i}
                    justify={m.role === "user" ? "flex-end" : "flex-start"}
                  >
                    <Flex align="flex-start" gap="2">
                      {m.role !== "user" && (
                        <Avatar.Root>
                          <Avatar.Image src="https://bit.ly/broken-link" />
                          <Avatar.Fallback>AI</Avatar.Fallback>
                        </Avatar.Root>
                      )}
                      <Box
                        bg={m.role === "user" ? "black" : "gray.300"}
                        color={m.role === "user" ? "white" : "black"}
                        p="3"
                        rounded="lg"
                        maxW="100%"
                        userSelect="text"
                        css={{
                          "& *": {
                            userSelect: "text",
                            cursor: "text",
                          },
                        }}
                      >
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </Box>
                      <div ref={bottomRef}></div>
                    </Flex>
                  </Flex>
                );
              })
            )}

            {/* //when ai response is loading */}
            {loading && (
              <Flex justify="flex-start">
                <Flex align="flex-start" gap="2">
                  <Avatar.Root>
                    <Avatar.Image src="https://bit.ly/broken-link" />
                    <Avatar.Fallback>AI</Avatar.Fallback>
                  </Avatar.Root>
                  <Box p="3" rounded="lg">
                    <Spinner />
                  </Box>
                </Flex>
              </Flex>
            )}

            {/* when theres an error */}
            {error && (
              <Flex justify="flex-start">
                <Flex align="flex-start" gap="2">
                  <Avatar.Root>
                    <Avatar.Image src="https://bit.ly/broken-link" />
                    <Avatar.Fallback>AI</Avatar.Fallback>
                  </Avatar.Root>
                  <Box bg="red.100" color="red.700" p="3" mb="4" rounded="md">
                    {error}
                  </Box>
                  <Button onClick={retrySendMessage}>⟳</Button>
                </Flex>
              </Flex>
            )}
          </VStack>
        </Box>

        {/* Input */}
        <Flex p="4" align="center" gap="2" borderTop="1px solid #ddd">
          <Textarea
            placeholder="Type a message..."
            p="4"
            pl="8"
            resize="none"
            rows={1}
            borderRadius="full"
            value={userMsg}
            onChange={(e) => setUserMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            colorScheme="blackAlpha"
            disabled={!userMsg.trim()}
            onClick={handleSendMessage}
          >
            Send
          </Button>
        </Flex>

        {!isLargeScreen ?
          (isOpen && (
            <Box
              position="fixed"
              top="0"
              left="0"
              width="100%" // Same width as your sidebar
              height="100vh"
              backdropFilter="blur(4px)"
              bg="rgba(255,255,255,0.2)"
              zIndex={5}
            />
          )): ""}
      </Flex>

      {/*side bar*/}
      {(!isLargeScreen || isOpen) && (
        <Box
          position={isLargeScreen ? "absolute" : "relative"}
          display={isLargeScreen ? "" : "block"}
          overflowY="auto"
          bg="gray.100"
          height="100vh"
          width={isLargeScreen ? "65%" : "30%"}
          maxW={isLargeScreen ? "" : "25%"}
          p="4"
        >
          <Flex justify="space-between" mb="8">
            <Button onClick={createNewChat}>New Chat</Button>
            {isLargeScreen && <Button onClick={closeSideBar}>X</Button>}
          </Flex>

          <Text color="gray.300">Chats</Text>
          <List.Root cursor="pointer" listStyle="none">
            {thread.map((t, i) => (
              //added event listener for navigating threads
              <Flex key={t.id} justify="space-between">
                <ListItem
                  py="3"
                  onClick={() => {
                    setSelectedThreadIndex(i);
                    closeSideBar();
                  }}
                >
                  {t.title}
                </ListItem>
                <Button
                  bg="transparent"
                  color="black"
                  fontSize="18px"
                  fontWeight="700"
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThread(t.id);
                  }}
                >
                  <Image src="/trash.png" width={15} height={15} alt="delete" />
                </Button>
              </Flex>
            ))}
          </List.Root>
        </Box>
      )}
    </Flex>
  );
}
