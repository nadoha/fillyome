import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CURRENCIES = [
  { code: "KRW", name: "한국 원", symbol: "₩" },
  { code: "USD", name: "미국 달러", symbol: "$" },
  { code: "EUR", name: "유로", symbol: "€" },
  { code: "JPY", name: "일본 엔", symbol: "¥" },
  { code: "CNY", name: "중국 위안", symbol: "¥" },
  { code: "VND", name: "베트남 동", symbol: "₫" },
  { code: "PHP", name: "필리핀 페소", symbol: "₱" },
];

const CurrencyExchange = () => {
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
        throw new Error("환율 정보를 가져올 수 없습니다");
      }

      const data = await response.json();
      const exchangeRate = data.rates[toCurrency];
      
      if (!exchangeRate) {
        throw new Error("환율 정보를 찾을 수 없습니다");
      }

      setRate(exchangeRate);
      setResult(Number(amount) * exchangeRate);
    } catch (error) {
      console.error("환율 변환 오류:", error);
      toast({
        title: "오류",
        description: "환율 정보를 가져오는데 실패했습니다",
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
          <h1 className="text-3xl font-bold">환율 계산기</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>통화 변환</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">금액</Label>
              <Input
                id="amount"
                type="number"
                placeholder="금액을 입력하세요"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="from">보내는 통화</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger id="from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name}
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
              >
                <ArrowLeftRight className="w-5 h-5" />
              </Button>

              <div className="space-y-2">
                <Label htmlFor="to">받는 통화</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger id="to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-muted-foreground">
                환율 정보를 가져오는 중...
              </div>
            ) : result !== null ? (
              <div className="space-y-4 p-6 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">
                    변환 결과
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {result.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {CURRENCIES.find((c) => c.code === toCurrency)?.symbol}
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
              환율은 실시간으로 변동될 수 있습니다
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CurrencyExchange;
