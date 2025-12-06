"use client";
import React from "react";
import { SetStateAction } from "react";
import { Box, Flex, Button, Text, ListItem, List } from "@chakra-ui/react";
import Image from "next/image";
import { Thread } from "@/app/page";

interface SideBarProps {
  isSmallScreen: boolean;
  isOpen: boolean;
  createNewChat: () => void;
  closeSideBar: () => void;
  thread: Thread[];
  setSelectedThreadIndex: (value: SetStateAction<number>) => void;
  deleteThread(id: string): void;
}

function Sidebar({
  isSmallScreen,
  isOpen,
  createNewChat,
  closeSideBar,
  thread,
  setSelectedThreadIndex,
  deleteThread,
}: SideBarProps) {
  return (
    <>
      {(!isSmallScreen || isOpen) && (
        <Box
          position={isSmallScreen ? "absolute" : "relative"}
          display={isSmallScreen ? "" : "block"}
          overflowY="auto"
          bg="#bababaff"
          height="100vh"
          width={isSmallScreen ? "65%" : "30%"}
          maxW={isSmallScreen ? "" : "25%"}
          p="4"
          zIndex={isSmallScreen ? "5" : ""}
        >
          <Flex justify="space-between" mb="8">
            <Button onClick={createNewChat} bg="black" color="white">
              New Chat
            </Button>
            {isSmallScreen && (
              <Button onClick={closeSideBar} bg="black" color="white">
                X
              </Button>
            )}
          </Flex>

          <Text color="black">Chats</Text>
          <List.Root cursor="pointer" listStyle="none">
            {thread.map((t, i) => (
              //added event listener for navigating threads
              <Flex key={t.id} justify="space-between" alignItems="center">
                <ListItem
                  py="3"
                  color="black"
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
    </>
  );
}

export default Sidebar;
