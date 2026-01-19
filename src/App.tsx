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
import TranslationQuiz from "./pages/TranslationQuiz";
import WrongAnswers from "./pages/WrongAnswers";
import Stats from "./pages/Stats";
import CurrencyExchange from "./pages/CurrencyExchange";
import JapaneseLearning from "./pages/JapaneseLearning";
import MicroLesson from "./pages/MicroLesson";
import Privacy from "./pages/Privacy";
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
            <Route path="/translation-quiz" element={<TranslationQuiz />} />
            <Route path="/wrong-answers" element={<WrongAnswers />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/currency" element={<CurrencyExchange />} />
            <Route path="/japanese" element={<JapaneseLearning />} />
            <Route path="/micro-lesson" element={<MicroLesson />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
