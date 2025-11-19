import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

const CURRENCY_CODES = [
  { code: "KRW", symbol: "₩" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
  { code: "VND", symbol: "₫" },
  { code: "PHP", symbol: "₱" },
];

type HistoryData = {
  date: string;
  rate: number;
};

type Period = "1d" | "1w" | "1m" | "1y" | "5y";

const CurrencyExchange = () => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("1");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("KRW");
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("1w");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (amount && fromCurrency && toCurrency) {
      convertCurrency();
      fetchHistoryData();
    }
  }, [amount, fromCurrency, toCurrency, selectedPeriod]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      convertCurrency();
      fetchHistoryData();
    }, 60000); // 1분마다 자동 갱신

    return () => clearInterval(interval);
  }, [autoRefresh, amount, fromCurrency, toCurrency, selectedPeriod]);

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
      setLastUpdated(new Date());
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

  const getDateRange = (period: Period) => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case "1d":
        start.setDate(end.getDate() - 1);
        break;
      case "1w":
        start.setDate(end.getDate() - 7);
        break;
      case "1m":
        start.setMonth(end.getMonth() - 1);
        break;
      case "1y":
        start.setFullYear(end.getFullYear() - 1);
        break;
      case "5y":
        start.setFullYear(end.getFullYear() - 5);
        break;
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const fetchHistoryData = async () => {
    if (!fromCurrency || !toCurrency) return;
    
    setLoadingHistory(true);
    try {
      const { start, end } = getDateRange(selectedPeriod);
      const response = await fetch(
        `https://api.frankfurter.app/${start}..${end}?from=${fromCurrency}&to=${toCurrency}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      const rates = data.rates;
      
      if (!rates || Object.keys(rates).length === 0) {
        setHistoryData([]);
        return;
      }
      
      const formattedData: HistoryData[] = Object.entries(rates)
        .map(([date, rateData]: [string, any]) => ({
          date,
          rate: rateData[toCurrency]
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setHistoryData(formattedData);
    } catch (error) {
      console.error("History fetch error:", error);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <ScrollArea className="h-screen">
      <div className="min-h-screen bg-background p-4 md:p-8 pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t("currencyExchange")}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                id="auto-refresh"
              />
              <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                {t("autoRefresh")}
              </Label>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                convertCurrency();
                fetchHistoryData();
              }}
              disabled={loading}
              title={t("refreshRate")}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
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

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
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
                className="mt-6 h-11 w-11"
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

            <div className="space-y-2">
              {lastUpdated && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>{t("lastUpdated")}: {lastUpdated.toLocaleString()}</span>
                </div>
              )}
              <div className="text-center p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary">{t("dataSource")}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("dataSourceInfo")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("frankfurterApi")}
                </div>
              </div>
              <div className="text-center p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  ⚠️ {t("disclaimer")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("disclaimerText")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("exchangeRateHistory")}</CardTitle>
              <div className="flex gap-2">
                {(["1d", "1w", "1m", "1y", "5y"] as Period[]).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {t(`period${period}`)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (selectedPeriod === "1d") {
                          return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                        } else if (selectedPeriod === "1w" || selectedPeriod === "1m") {
                          return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        } else {
                          return date.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
                        }
                      }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                      tickFormatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--popover-foreground))',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      }}
                      formatter={(value: number) => [
                        `${value.toFixed(4)} ${toCurrency}`,
                        `1 ${fromCurrency}`
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center text-xs text-muted-foreground">
                  {historyData.length} {t("dataSource")} • {fromCurrency}/{toCurrency}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingUp className="w-12 h-12 opacity-20" />
                <p className="text-sm">{t("noHistoryData")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </ScrollArea>
  );
};

export default CurrencyExchange;
