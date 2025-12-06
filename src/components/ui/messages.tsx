import React, {JSX, RefObject} from "react"; 
 
 import { VStack, Flex, Button, Box, Avatar, Spinner } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import { Thread } from "@/app/page";
 
interface MessageProp {
    closeSideBar: ()=> void,
    currentThread: Thread,
    bottomRef: RefObject<HTMLDivElement | null>,
    loading: boolean,
    error: string,
    retrySendMessage: ()=>Promise<void>

} 

 function MessagePart({closeSideBar, currentThread, bottomRef, loading, error, retrySendMessage}: MessageProp) {
   return (
     <>
      {/* message side */}
          <VStack
            align="stretch"
            gap="3"
            onClick={closeSideBar}
            minH="0"
            userSelect="text"
          >
            {currentThread.messages.length === 0 ? (
              <Flex width="100%" align="center" justify="center" height="100vh">
                <Box
                  fontSize="2rem"
                  textAlign="center"
                  zIndex={3}
                  color="white"
                >
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
                        bg={m.role === "user" ? "#2563eb" : "#262626"}
                        color="white"
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
     </>
   )
 }
 
 export default MessagePart
 
