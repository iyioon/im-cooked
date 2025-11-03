"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChefHat, Send, User, Bot, Trash2, Settings } from "lucide-react";
import { RecipeResults, RecipeResultsLoading } from "@/components/recipe-results";
import { RecipeSidebar } from "@/components/recipe-sidebar";
import { Recipe, UserPreferences, RecipeDetail, RecipeDetailWithContext } from "@/types/recipe";
import { Message, saveChatHistory, loadChatHistory, clearChatHistory } from "@/lib/chat-storage";
import { PreferencesDialog } from "@/components/preferences-dialog";
import { loadPreferences } from "@/lib/preferences-manager";
import { createCookingSession } from "@/lib/cooking-session-manager";

export default function Dashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetailWithContext | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isFetchingRecipeDetail, setIsFetchingRecipeDetail] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
    }
  }, []);

  // Load preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setPreferences(prefs);
  }, []);

  // Reload preferences when dialog closes
  useEffect(() => {
    if (!preferencesOpen) {
      const prefs = loadPreferences();
      setPreferences(prefs);
    }
  }, [preferencesOpen]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleClearHistory = () => {
    setMessages([]);
    clearChatHistory();
  };

  const handleViewRecipe = (recipe: Recipe) => {
    router.push(`/recipe/${recipe.id}`);
  };

  const handleSelectRecipe = async (recipe: Recipe) => {
    setIsFetchingRecipeDetail(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`);
      if (!response.ok) throw new Error("Failed to fetch recipe details");

      const recipeDetail: RecipeDetail = await response.json();

      const recipeWithContext: RecipeDetailWithContext = {
        original: recipeDetail,
        current: { ...recipeDetail },
        modifications: {
          substitutions: [],
          ingredientEdits: [],
          warnings: [],
        },
        metadata: {
          selectedAt: new Date(),
          lastModifiedAt: new Date(),
          userPreferences: preferences || null,
        },
      };

      setSelectedRecipe(recipeWithContext);
      setIsSidebarExpanded(true);
    } catch (error) {
      console.error("Error fetching recipe details:", error);
    } finally {
      setIsFetchingRecipeDetail(false);
    }
  };

  const handleSidebarClose = () => {
    setSelectedRecipe(null);
  };

  const handleToggleSidebarExpand = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  const handleIngredientModified = (modifiedRecipe: RecipeDetailWithContext) => {
    setSelectedRecipe(modifiedRecipe);
  };

  const handleStartCooking = () => {
    if (selectedRecipe) {
      // Use the modified recipe from the sidebar
      const recipeToUse = selectedRecipe.current;
      const session = createCookingSession(recipeToUse);
      router.push(`/cooking-session/${selectedRecipe.current.id}?session=${session.id}`);
      handleSidebarClose();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // Call recipe search API
      const response = await fetch("/api/recipes/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: currentInput,
          preferences: preferences
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to search recipes");
      }

      const data = await response.json();

      if (data.recipes && data.recipes.length > 0) {
        // Recipe search successful - show recipe results
        const recipeMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
          recipes: data.recipes,
          isRecipeSearch: true,
          query: currentInput,
        };
        setMessages((prev) => [...prev, recipeMessage]);
      } else {
        // No recipes found - show friendly message
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I couldn't find any recipes for "${currentInput}". Try searching for specific dishes like "chocolate cake" or "chicken pasta"!`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error("Error searching recipes:", error);
      
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble searching for recipes right now. Please try again in a moment!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <ChefHat className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              I'm Cooked
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPreferencesOpen(true)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            {messages.length > 0 && (
              <Button
                onClick={handleClearHistory}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Chat Area with Sidebar Container - Side by side layout */}
      <main className="flex-1 pt-16 pb-32 overflow-hidden">
        <div className="h-full flex">
          {/* Chat Section - Takes remaining space */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full px-4 sm:px-6 lg:px-8">
              <ScrollArea className="h-full py-8">
            {messages.length === 0 ? (
              // Empty State
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10">
                  <Bot className="h-10 w-10 text-blue-400" strokeWidth={2} />
                </div>
                <h2 className="mb-3 text-3xl font-bold text-white">
                  Ask me anything about cooking!
                </h2>
                <p className="text-lg text-gray-400 max-w-md">
                  I'm your AI cooking assistant. Search for recipes, get cooking tips, or ask for recommendations.
                </p>
                
                {/* Suggestion Pills */}
                <div className="mt-8 flex flex-wrap gap-3 justify-center max-w-2xl">
                  {[
                    "chocolate chip cookies",
                    "quick pasta recipes",
                    "healthy dinner ideas",
                    "easy desserts"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(suggestion)}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Messages
              <div className="space-y-8">
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.role === "user" ? (
                      <div className="flex gap-4 justify-end">
                        <div className="max-w-[70%] rounded-2xl px-5 py-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20">
                          <p className="text-base leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                        <Avatar className="h-10 w-10 border-2 border-purple-500/50">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600">
                            <User className="h-5 w-5 text-white" strokeWidth={2} />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <div className="flex gap-4 justify-start">
                        <Avatar className="h-10 w-10 border-2 border-blue-500/50">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                            <Bot className="h-5 w-5 text-white" strokeWidth={2} />
                          </AvatarFallback>
                        </Avatar>
                        
                        {message.isRecipeSearch && message.recipes ? (
                          <div className="flex-1">
                            <RecipeResults
                              recipes={message.recipes}
                              query={message.query || ""}
                              onViewRecipe={handleViewRecipe}
                              onSelectRecipe={handleSelectRecipe}
                            />
                          </div>
                        ) : (
                          <div className="max-w-[70%] rounded-2xl px-5 py-3 bg-white/5 border border-white/10 text-white backdrop-blur-sm">
                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Loading State */}
                {isLoading && (
                  <div className="flex gap-4 justify-start">
                    <Avatar className="h-10 w-10 border-2 border-blue-500/50">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                        <Bot className="h-5 w-5 text-white" strokeWidth={2} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <RecipeResultsLoading />
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
              </ScrollArea>
            </div>
          </div>

          {/* Recipe Sidebar - Side panel */}
          {selectedRecipe && (
            <RecipeSidebar
              recipe={selectedRecipe}
              isExpanded={isSidebarExpanded}
              onToggleExpand={handleToggleSidebarExpand}
              onClose={handleSidebarClose}
              onStartCooking={handleStartCooking}
              onIngredientModified={handleIngredientModified}
            />
          )}
        </div>
      </main>

      {/* Bottom Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search for recipes or ask cooking questions..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-14 w-full rounded-2xl border-white/20 bg-white/5 px-6 text-base text-white placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500/50 backdrop-blur-sm transition-all disabled:opacity-50"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-0 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send className="h-5 w-5" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>

      {/* Preferences Dialog */}
      <PreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </div>
  );
}
