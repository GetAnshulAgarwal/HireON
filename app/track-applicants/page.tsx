"use client";

import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

interface Candidate {
  _id: string;
  username: string;
}

interface Job {
  _id: string;
  title: string;
}

interface Application {
  _id: string;
  job: Job;
  candidate: Candidate;
  status: string;
}

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: string;
  attachment?: string;
  attachmentType?: string;
}

interface Chat {
  _id: string;
  application: string;
  messages: ChatMessage[];
}

interface Notification {
  chatId: string;
  message: ChatMessage;
}

export default function TrackApplicants() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [showChatModal, setShowChatModal] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    const socketInstance = io("https://hiring-platform-beta.onrender.com", {
      auth: { token },
    });
    setSocket(socketInstance);

    const fetchApplications = async () => {
      try {
        const res = await fetch(
          "https://hiring-platform-beta.onrender.com/api/applications",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch applications");
        const data = await res.json();
        setApplications(data);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        toast.error(`Error: ${errorMessage}`);
        if (errorMessage.includes("401")) {
          localStorage.removeItem("token");
          router.push("/");
        }
      }
    };
    fetchApplications();

    socketInstance.on("connect", () => console.log("Socket connected"));
    socketInstance.on("connect_error", (err) =>
      console.error("Socket error:", err)
    );
    socketInstance.on("message", (message: ChatMessage) => {
      if (showChatModal) setChatMessages((prev) => [...prev, message]);
    });
    socketInstance.on(
      "notification",
      ({ chatId, message }: Notification) => {
        if (message.sender !== localStorage.getItem("userId")) {
          setNotifications((prev) => [...prev, { chatId, message }]);
          setTimeout(
            () => setNotifications((prev) => prev.slice(1)),
            5000
          );
        }
      }
    );

    return () => {
      socketInstance.off("message");
      socketInstance.off("notification");
      socketInstance.off("connect");
      socketInstance.off("connect_error");
      socketInstance.disconnect();
    };
  }, [router, showChatModal]);

  const openChat = async (applicationId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `https://hiring-platform-beta.onrender.com/api/chat/${applicationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to load chat");
      const chat: Chat = await res.json();
      setShowChatModal(chat);
      setChatMessages(chat.messages);
      if (socket) socket.emit("joinChat", chat._id);

      await fetch(
        `https://hiring-platform-beta.onrender.com/api/chat/${chat._id}/read`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Error loading chat: ${errorMessage}`);
    }
  };

  const sendMessage = async () => {
    if (!newMessage && !attachment) return;
    if (!showChatModal) return;
    const token = localStorage.getItem("token");
    const formData = new FormData();
    if (newMessage) formData.append("content", newMessage);
    if (attachment) formData.append("attachment", attachment);

    try {
      const res = await fetch(
        `https://hiring-platform-beta.onrender.com/api/chat/${showChatModal._id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error("Failed to send message");
      const message: ChatMessage = await res.json();
      if (socket)
        socket.emit("sendMessage", { chatId: showChatModal._id, message });
      setNewMessage("");
      setAttachment(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Error sending message: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar userType="recruiter" />
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-semibold text-center uppercase text-foreground mb-8">
          Track Applicants
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map((app) => (
            <div key={app._id} className="card">
              <h3 className="font-semibold text-lg text-foreground">
                {app.job.title}
              </h3>
              <p className="text-sm text-foreground">
                Candidate: {app.candidate.username}
              </p>
              <p className="text-sm text-foreground">Status: {app.status}</p>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => openChat(app._id)}
                  className="btn-secondary"
                >
                  Chat
                </button>
                <a
                  href={`https://hiring-platform-beta.onrender.com/api/resume/download/${app.candidate._id}`}
                  className="btn-primary"
                >
                  Download Resume
                </a>
              </div>
            </div>
          ))}
        </div>

        {showChatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal">
            <div className="bg-accent p-6 rounded-lg shadow-lg w-full max-w-lg modal-content">
              <h2 className="text-xl font-bold text-primary mb-4">
                Chat with Candidate
              </h2>
              <div className="h-64 overflow-y-auto mb-4 bg-background p-2 rounded">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-2 ${
                      msg.sender === localStorage.getItem("userId")
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <p className="text-foreground">{msg.content}</p>
                    {msg.attachment && (
                      <a
                        href={`https://hiring-platform-beta.onrender.com${msg.attachment}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-info underline"
                      >
                        {msg.attachmentType === "link"
                          ? msg.content
                          : `Attachment (${msg.attachmentType})`}
                      </a>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="input-field"
                placeholder="Type a message..."
              />
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) =>
                  setAttachment(e.target.files ? e.target.files[0] : null)
                }
                className="mt-2 text-foreground"
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => setShowChatModal(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button onClick={sendMessage} className="btn-primary">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {notifications.map((notif, index) => (
          <div
            key={index}
            className="fixed top-4 right-4 bg-accent text-foreground p-4 rounded-lg shadow-lg z-50"
          >
            New message in chat {notif.chatId}
          </div>
        ))}
      </main>
    </div>
  );
}