import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import DocumentTranslation from "./pages/DocumentTranslation";
import Vocabulary from "./pages/Vocabulary";
import Dictionary from "./pages/Dictionary";
import Learn from "./pages/Learn";
import Flashcards from "./pages/Flashcards";
import Review from "./pages/Review";
import Quiz from "./pages/Quiz";
import Stats from "./pages/Stats";
import CurrencyExchange from "./pages/CurrencyExchange";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/document" element={<DocumentTranslation />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/dictionary" element={<Dictionary />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/review" element={<Review />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/currency" element={<CurrencyExchange />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
