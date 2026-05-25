import React from "react";
import { motion } from "framer-motion";
import { Gift, CreditCard, Car, Droplets, Home, Percent, Award, ChevronRight, Star, Shield, Trophy, Medal, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface RewardsSectionProps {
  points: number;
}

const badges = [
  { id: 'active_citizen', label: 'Active Citizen', icon: Star, description: 'Submit your first complaint', threshold: 1, color: 'from-blue-500 to-cyan-500' },
  { id: 'city_helper', label: 'City Helper', icon: Shield, description: '5 verified complaints', threshold: 50, color: 'from-green-500 to-emerald-500' },
  { id: 'road_guardian', label: 'Road Guardian', icon: Trophy, description: '10 resolved complaints', threshold: 100, color: 'from-amber-500 to-orange-500' },
  { id: 'champion', label: 'Gujarat Champion', icon: Medal, description: '25 complaints resolved', threshold: 250, color: 'from-purple-500 to-pink-500' },
];

export function RewardsSection({ points }: RewardsSectionProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const voucherOptions = [
    { id: "property_tax", label: t("propertyTax"), icon: Home, minPoints: 100, discount: "30%" },
    { id: "water_bill", label: t("waterBill"), icon: Droplets, minPoints: 10, discount: "30%" },
    { id: "rto_fines", label: t("rtoFines"), icon: Car, minPoints: 75, discount: "30%" },
  ];

  const generateVoucher = (option: (typeof voucherOptions)[0]) => {
    if (points < option.minPoints) {
      toast({ title: "Insufficient Points", description: `You need at least ${option.minPoints} points.`, variant: "destructive" });
      return;
    }
    const voucherCode = `GUJ${Date.now().toString(36).toUpperCase()}`;
    toast({
      title: "Voucher Generated! 🎉",
      description: (
        <div className="mt-2">
          <p className="font-mono font-bold text-lg">{voucherCode}</p>
          <p className="text-sm mt-1">{option.discount} off on {option.label}</p>
          <p className="text-xs text-muted-foreground mt-1">Valid for 30 days</p>
        </div>
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Points Balance Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="govt-card overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm opacity-80", language === "gu" ? "font-gujarati" : "")}>
                  {t("currentBalance")}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold">{points}</span>
                  <span className={cn("text-lg", language === "gu" ? "font-gujarati" : "")}>{t("points")}</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
            </div>
            {/* Points to next badge */}
            {(() => {
              const nextBadge = badges.find(b => points < b.threshold);
              if (!nextBadge) return null;
              const progress = (points / nextBadge.threshold) * 100;
              return (
                <div className="mt-4">
                  <div className="flex justify-between text-xs opacity-80 mb-1">
                    <span>Next: {nextBadge.label}</span>
                    <span>{points}/{nextBadge.threshold} pts</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-white/20" />
                </div>
              );
            })()}
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-accent" />
              <span>Earn 10 points when your complaint is resolved</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievement Badges */}
      <div>
        <h3 className={cn("text-lg font-semibold mb-4 flex items-center gap-2", language === "gu" ? "font-gujarati" : "")}>
          <Trophy className="w-5 h-5 text-accent" />
          Achievement Badges
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            const earned = points >= badge.threshold;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "govt-card overflow-hidden transition-all",
                  earned ? "ring-2 ring-accent/50" : "opacity-60 grayscale"
                )}>
                  <CardContent className="p-4 text-center">
                    <div className={cn(
                      "w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-gradient-to-br",
                      earned ? badge.color : "from-muted to-muted"
                    )}>
                      <Icon className={cn("w-7 h-7", earned ? "text-white" : "text-muted-foreground")} />
                    </div>
                    <p className="font-bold text-sm">{badge.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    {earned && (
                      <Badge className="mt-2 bg-accent/10 text-accent border-accent/30 text-xs">
                        ✅ Earned
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Voucher Options */}
      <div>
        <h3 className={cn("text-lg font-semibold mb-4 flex items-center gap-2", language === "gu" ? "font-gujarati" : "")}>
          <Percent className="w-5 h-5 text-accent" />
          {t("generateVoucher")}
        </h3>
        <div className="space-y-3">
          {voucherOptions.map((option, index) => {
            const Icon = option.icon;
            const canRedeem = points >= option.minPoints;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn("govt-card transition-all", canRedeem ? "hover:border-accent/50" : "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          canRedeem ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className={cn("font-semibold", language === "gu" ? "font-gujarati" : "")}>
                            {option.label}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {option.discount} {t("discount")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Min: {option.minPoints} pts</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={!canRedeem}
                        onClick={() => generateVoucher(option)}
                        className={cn(canRedeem ? "btn-saffron" : "bg-muted text-muted-foreground")}
                      >
                        Redeem
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-accent mt-0.5" />
            <div>
              <p className={cn("font-medium text-sm", language === "gu" ? "font-gujarati" : "")}>How it works</p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate a voucher code to get 30% discount on selected Government services. Present the code at any
                designated payment center or use online.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
