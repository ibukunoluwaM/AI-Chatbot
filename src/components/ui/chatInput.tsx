"use client";

import { Flex, Textarea, Button } from "@chakra-ui/react";
import { KeyboardEvent } from "react";
interface ChatInputProps {
  userMsg: string;
  setUserMsg: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: () => void;
}

export default function ChatInput({
  userMsg,
  setUserMsg,
  handleSendMessage,
}: ChatInputProps) {
  return (
    <Flex
      p="4"
      align="center"
      gap="2"
      bg="#1a1a1a"
      position="sticky"
      bottom="0"
      borderTop="1px solid #ddd"
      zIndex="20"
    >
      <Textarea
        placeholder="Type a message..."
        p="4"
        pl="8"
        color="white"
        resize="none"
        rows={1}
        borderRadius="full"
        value={userMsg}
        onChange={(e) => setUserMsg(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
      />
      <Button
        color="white"
        bg="black"
        disabled={!userMsg.trim()}
        onClick={handleSendMessage}
      >
        Send
      </Button>
    </Flex>
  );
}
