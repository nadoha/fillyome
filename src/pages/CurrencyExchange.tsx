import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CURRENCY_CODES = [
  { code: "KRW", symbol: "₩" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
  { code: "VND", symbol: "₫" },
  { code: "PHP", symbol: "₱" },
];

const CurrencyExchange = () => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("1");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("KRW");
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (amount && fromCurrency && toCurrency) {
      convertCurrency();
    }
  }, [amount, fromCurrency, toCurrency]);

  const convertCurrency = async () => {
    if (!amount || isNaN(Number(amount))) {
      setResult(null);
      setRate(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`
      );
      
      if (!response.ok) {
        throw new Error(t("exchangeRateError"));
      }

      const data = await response.json();
      const exchangeRate = data.rates[toCurrency];
      
      if (!exchangeRate) {
        throw new Error(t("exchangeRateNotFound"));
      }

      setRate(exchangeRate);
      setResult(Number(amount) * exchangeRate);
    } catch (error) {
      console.error("Exchange rate error:", error);
      toast({
        title: t("authError"),
        description: t("exchangeRateFetchError"),
        variant: "destructive",
      });
      setResult(null);
      setRate(null);
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t("currencyExchange")}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("currencyConverter")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("amount")}</Label>
              <Input
                id="amount"
                type="number"
                placeholder={t("enterAmount")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="from">{t("fromCurrency")}</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger id="from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_CODES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {t(currency.code.toLowerCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={swapCurrencies}
                className="mb-1"
                aria-label={t("swapCurrencies")}
              >
                <ArrowLeftRight className="w-5 h-5" />
              </Button>

              <div className="space-y-2">
                <Label htmlFor="to">{t("toCurrency")}</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger id="to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_CODES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {t(currency.code.toLowerCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-muted-foreground">
                {t("fetchingExchangeRate")}
              </div>
            ) : result !== null ? (
              <div className="space-y-4 p-6 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">
                    {t("conversionResult")}
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {result.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {CURRENCY_CODES.find((c) => c.code === toCurrency)?.symbol}
                  </div>
                </div>
                {rate && (
                  <div className="text-center text-sm text-muted-foreground">
                    1 {fromCurrency} = {rate.toLocaleString(undefined, {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}{" "}
                    {toCurrency}
                  </div>
                )}
              </div>
            ) : null}

            <div className="text-xs text-muted-foreground text-center">
              {t("exchangeRateDisclaimer")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CurrencyExchange;
