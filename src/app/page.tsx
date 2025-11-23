import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Timer, MessageCircle, Search, Sparkles, ChefHat } from "lucide-react";
import { VideoBackground } from "@/components/layout/video-background";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 min-h-screen overflow-hidden">
        {/* YouTube Video Background */}
        <VideoBackground />

        {/* Dark overlay */}
        <div className="absolute inset-0 z-10 bg-black/75 backdrop-blur-[2px]" />

        {/* Content */}
        <div className="relative z-20 mx-auto max-w-5xl text-center">
          {/* Large chef hat icon with subtle animation */}
          <div className="mb-12 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/30">
              <ChefHat className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={2} />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/20 to-purple-500/20 animate-pulse" />
            </div>
          </div>

          {/* Powerful headline */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100 leading-tight">
            Your AI Cooking Coach
          </h1>

          {/* Subheadline - one powerful sentence */}
          <p className="mb-12 text-xl sm:text-2xl md:text-3xl text-gray-400 max-w-3xl mx-auto font-light animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Hands-free voice guidance that walks you through every step
          </p>

          {/* Single prominent CTA */}
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-12 text-lg font-semibold shadow-2xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0"
              >
                <Sparkles className="mr-2 h-6 w-6" />
                Start Cooking
              </Button>
            </Link>
          </div>

          {/* Subtle trust badge */}
          <div className="mt-16 animate-in fade-in duration-1000 delay-500">
            <Badge
              variant="secondary"
              className="text-sm px-4 py-2 backdrop-blur-sm bg-white/10 border-white/20 text-gray-300"
            >
              Powered by Gemini AI 2.0
            </Badge>
          </div>
        </div>
      </section>

      {/* The Flow - Visual 3-step journey */}
      <section className="px-4 py-20 sm:py-28 bg-white/5 backdrop-blur-3xl border-y border-white/10">
        <div className="mx-auto max-w-6xl">
          {/* Section intro - minimal */}
          <div className="mb-20 text-center">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-white">
              How it works
            </h2>
          </div>

          {/* 3-step flow */}
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            {/* Step 1 */}
            <div className="relative text-center group">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all group-hover:scale-110 group-hover:shadow-xl">
                    <Search className="h-10 w-10" strokeWidth={2} />
                  </div>
                  <div className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black font-bold text-sm shadow-md">
                    1
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Discover</h3>
              <p className="text-lg text-gray-400">Find and customize any recipe</p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center group">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg transition-all group-hover:scale-110 group-hover:shadow-xl">
                    <Mic className="h-10 w-10" strokeWidth={2} />
                  </div>
                  <div className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black font-bold text-sm shadow-md">
                    2
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Cook</h3>
              <p className="text-lg text-gray-400">Voice-guided step-by-step</p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center group">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg transition-all group-hover:scale-110 group-hover:shadow-xl">
                    <Sparkles className="h-10 w-10" strokeWidth={2} />
                  </div>
                  <div className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black font-bold text-sm shadow-md">
                    3
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Perfect</h3>
              <p className="text-lg text-gray-400">Ask questions anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features - 3 compelling cards */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          {/* Grid of feature cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Hands-Free Cooking */}
            <Card className="group relative overflow-hidden border-2 border-white/10 transition-all hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 hover:border-blue-500/50 backdrop-blur-sm bg-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 transition-all group-hover:scale-110">
                  <Mic className="h-7 w-7" strokeWidth={2} />
                </div>
                <CardTitle className="text-2xl text-white">Hands-Free Cooking</CardTitle>
                <CardDescription className="text-base leading-relaxed text-gray-400">
                  Keep your hands clean. Voice commands for everything.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2: Smart Timers */}
            <Card className="group relative overflow-hidden border-2 border-white/10 transition-all hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 hover:border-purple-500/50 backdrop-blur-sm bg-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-400 transition-all group-hover:scale-110">
                  <Timer className="h-7 w-7" strokeWidth={2} />
                </div>
                <CardTitle className="text-2xl text-white">Smart Timers</CardTitle>
                <CardDescription className="text-base leading-relaxed text-gray-400">
                  AI tracks all timers automatically. No more forgotten pans.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3: Ask Anything */}
            <Card className="group relative overflow-hidden border-2 border-white/10 transition-all hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-2 hover:border-pink-500/50 backdrop-blur-sm bg-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 text-pink-400 transition-all group-hover:scale-110">
                  <MessageCircle className="h-7 w-7" strokeWidth={2} />
                </div>
                <CardTitle className="text-2xl text-white">Ask Anything</CardTitle>
                <CardDescription className="text-base leading-relaxed text-gray-400">
                  Stuck? Ask the AI. Get instant answers while cooking.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA - Simple and powerful */}
      <section className="px-4 py-24 sm:py-32 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black via-blue-950/10 to-purple-950/10" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />

        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-8 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white">
            Ready to transform your cooking?
          </h2>

          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-14 px-12 text-lg font-semibold shadow-2xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0"
            >
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-white/10 px-4 py-8 backdrop-blur-sm bg-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <ChefHat className="h-5 w-5 text-blue-400" strokeWidth={2} />
              <span className="font-bold text-white">I'm Cooked</span>
              <span className="text-gray-500">© 2025</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
