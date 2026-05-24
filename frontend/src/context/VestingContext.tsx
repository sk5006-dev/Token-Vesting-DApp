"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import confetti from "canvas-confetti";

export interface VestingSchedule {
  id: string;
  beneficiary: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  start: number; // timestamp in seconds
  cliff: number; // timestamp in seconds
  duration: number; // seconds
  slicePeriodSeconds: number; // seconds
  amountTotal: number; // number of tokens
  released: number; // number of tokens
  revocable: boolean;
  revoked: boolean;
  usdRate: number; // USD price of 1 token
}

export interface ActivityLog {
  id: string;
  type: "claim" | "create" | "revoke" | "withdraw";
  scheduleId?: string;
  beneficiary: string;
  tokenSymbol: string;
  amount: number;
  timestamp: number;
  txHash: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  type: "info" | "success" | "warning";
}

interface VestingContextType {
  schedules: VestingSchedule[];
  logs: ActivityLog[];
  notifications: Notification[];
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewingScheduleId: string | null;
  setViewingScheduleId: (id: string | null) => void;
  walletHealthScore: number;
  riskIndicator: "low" | "medium" | "high";
  createSchedule: (schedule: Omit<VestingSchedule, "id" | "released" | "revoked">) => void;
  claimTokens: (scheduleId: string, amount: number) => Promise<boolean>;
  claimAllTokens: (scheduleId: string) => Promise<boolean>;
  revokeSchedule: (scheduleId: string) => void;
  emergencyWithdraw: (tokenAddress: string, amount: number) => void;
  markAllNotificationsRead: () => void;
  exportData: () => void;
}

const VestingContext = createContext<VestingContextType | undefined>(undefined);

export const useVesting = () => {
  const context = useContext(VestingContext);
  if (!context) throw new Error("useVesting must be used within a VestingProvider");
  return context;
};

export const VestingProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();

  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activeTab, setActiveTab] = useState("landing");
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  
  // Set demo mode based on wagmi connection status
  useEffect(() => {
    if (isConnected) {
      setIsDemoMode(false);
    } else {
      setIsDemoMode(true);
    }
  }, [isConnected]);

  // Initial Mock Schedules
  const [schedules, setSchedules] = useState<VestingSchedule[]>([
    {
      id: "0x875a9f2bc...1d4f",
      beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tokenSymbol: "AET",
      tokenName: "Aether Premium Utility",
      tokenAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      start: Math.floor(Date.now() / 1000) - 180 * 24 * 60 * 60, // 180 days ago
      cliff: Math.floor(Date.now() / 1000) - 150 * 24 * 60 * 60, // 30 days cliff (expired 150 days ago)
      duration: 365 * 24 * 60 * 60, // 1 year
      slicePeriodSeconds: 1, // continuous
      amountTotal: 100000,
      released: 35000,
      revocable: true,
      revoked: false,
      usdRate: 2.45,
    },
    {
      id: "0x39cbf81fa...9b88",
      beneficiary: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      tokenSymbol: "OP",
      tokenName: "Optimism Reward",
      tokenAddress: "0x4200000000000000000000000000000000000042",
      start: Math.floor(Date.now() / 1000) - 10 * 24 * 60 * 60, // 10 days ago
      cliff: Math.floor(Date.now() / 1000) + 20 * 24 * 60 * 60, // 30 days cliff (in 20 days)
      duration: 180 * 24 * 60 * 60, // 6 months
      slicePeriodSeconds: 86400, // daily
      amountTotal: 25000,
      released: 0,
      revocable: false,
      revoked: false,
      usdRate: 1.82,
    },
    {
      id: "0x289f81dae...7f4a",
      beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tokenSymbol: "USDC",
      tokenName: "USD Stablecoin",
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      start: Math.floor(Date.now() / 1000) - 300 * 24 * 60 * 60, // 300 days ago
      cliff: Math.floor(Date.now() / 1000) - 270 * 24 * 60 * 60,
      duration: 300 * 24 * 60 * 60, // finished today
      slicePeriodSeconds: 1,
      amountTotal: 50000,
      released: 48000,
      revocable: true,
      revoked: false,
      usdRate: 1.00,
    }
  ]);

  // Initial Activity Logs
  const [logs, setLogs] = useState<ActivityLog[]>([
    {
      id: "1",
      type: "claim",
      scheduleId: "0x875a9f2bc...1d4f",
      beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tokenSymbol: "AET",
      amount: 15000,
      timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      txHash: "0x539c8fd91d8463d12d4d9b23e201b17b3543d34ffabec782df4971c261e47963",
    },
    {
      id: "2",
      type: "claim",
      scheduleId: "0x875a9f2bc...1d4f",
      beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tokenSymbol: "AET",
      amount: 20000,
      timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      txHash: "0xa2d9f823e201b17b3543d34ffabec782df4971c261e47963539c8fd91d8463d1",
    },
    {
      id: "3",
      type: "create",
      scheduleId: "0x39cbf81fa...9b88",
      beneficiary: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      tokenSymbol: "OP",
      amount: 25000,
      timestamp: Date.now() - 10 * 24 * 60 * 1000 * 60, // 10 days ago
      txHash: "0x9b23e201b17b3543d34ffabec782df4971c261e47963539c8fd91d8463d1a2d",
    }
  ]);

  // Initial Notifications
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "n1",
      title: "Vesting Schedule Complete",
      description: "Your USDC Vesting Schedule is now 100% unlocked. You can claim your remaining 2,000 USDC.",
      timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
      read: false,
      type: "success",
    },
    {
      id: "n2",
      title: "New Schedule Active",
      description: "Vesting schedule for 25,000 OP has been initialized and approved by smart contract admin.",
      timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      read: true,
      type: "info",
    }
  ]);

  // User details insights
  const walletHealthScore = isConnected ? 98 : 85;
  const riskIndicator = schedules.some(s => s.revocable && !s.revoked) ? "medium" : "low";

  // Actions
  const createSchedule = (newS: Omit<VestingSchedule, "id" | "released" | "revoked">) => {
    const randomHex = Math.floor(Math.random() * 1e16).toString(16);
    const id = `0x${randomHex}...${randomHex.substring(0, 4)}`;
    const schedule: VestingSchedule = {
      ...newS,
      id,
      released: 0,
      revoked: false,
    };
    
    setSchedules((prev) => [schedule, ...prev]);

    // Add activity log
    const log: ActivityLog = {
      id: Date.now().toString(),
      type: "create",
      scheduleId: id,
      beneficiary: newS.beneficiary,
      tokenSymbol: newS.tokenSymbol,
      amount: newS.amountTotal,
      timestamp: Date.now(),
      txHash: `0x${Math.floor(Math.random() * 1e32).toString(16)}`,
    };
    setLogs((prev) => [log, ...prev]);

    // Add notification
    const notification: Notification = {
      id: Date.now().toString(),
      title: "New Vesting Schedule Created",
      description: `Successfully locked ${newS.amountTotal.toLocaleString()} ${newS.tokenSymbol} for beneficiary ${newS.beneficiary.substring(0, 6)}...`,
      timestamp: Date.now(),
      read: false,
      type: "success",
    };
    setNotifications((prev) => [notification, ...prev]);

    // Trigger confetti on admin actions!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#a855f7", "#3b82f6", "#10b981"],
    });
  };

  const claimTokens = async (scheduleId: string, amount: number): Promise<boolean> => {
    // Simulate smart contract wait time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let claimed = false;
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          const maxClaimable = s.amountTotal - s.released;
          if (amount <= maxClaimable) {
            claimed = true;
            return { ...s, released: s.released + amount };
          }
        }
        return s;
      })
    );

    if (claimed) {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (schedule) {
        // Add activity log
        const log: ActivityLog = {
          id: Date.now().toString(),
          type: "claim",
          scheduleId,
          beneficiary: schedule.beneficiary,
          tokenSymbol: schedule.tokenSymbol,
          amount,
          timestamp: Date.now(),
          txHash: `0x${Math.floor(Math.random() * 1e32).toString(16)}`,
        };
        setLogs((prev) => [log, ...prev]);

        // Add notification
        const notification: Notification = {
          id: Date.now().toString(),
          title: "Token Release Successful",
          description: `Claimed ${amount.toLocaleString()} ${schedule.tokenSymbol} to wallet successfully.`,
          timestamp: Date.now(),
          read: false,
          type: "success",
        };
        setNotifications((prev) => [notification, ...prev]);

        // Trigger confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#a855f7", "#ec4899", "#3b82f6"],
        });
      }
    }

    return claimed;
  };

  const claimAllTokens = async (scheduleId: string): Promise<boolean> => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return false;

    // Calculate dynamic releasable amount
    const time = Math.floor(Date.now() / 1000);
    let vested = 0;
    if (time >= schedule.cliff) {
      if (time >= schedule.start + schedule.duration) {
        vested = schedule.amountTotal;
      } else {
        const timePastStart = time - schedule.start;
        const periods = Math.floor(timePastStart / schedule.slicePeriodSeconds);
        const secs = periods * schedule.slicePeriodSeconds;
        vested = Math.floor((schedule.amountTotal * secs) / schedule.duration);
      }
    }
    const releasable = vested - schedule.released;

    if (releasable <= 0) return false;

    return await claimTokens(scheduleId, releasable);
  };

  const revokeSchedule = (scheduleId: string) => {
    let targetSchedule: VestingSchedule | undefined;

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          targetSchedule = s;
          return { ...s, revoked: true };
        }
        return s;
      })
    );

    if (targetSchedule) {
      // Add activity log
      const log: ActivityLog = {
        id: Date.now().toString(),
        type: "revoke",
        scheduleId,
        beneficiary: targetSchedule.beneficiary,
        tokenSymbol: targetSchedule.tokenSymbol,
        amount: targetSchedule.amountTotal - targetSchedule.released,
        timestamp: Date.now(),
        txHash: `0x${Math.floor(Math.random() * 1e32).toString(16)}`,
      };
      setLogs((prev) => [log, ...prev]);

      // Add notification
      const notification: Notification = {
        id: Date.now().toString(),
        title: "Vesting Schedule Revoked",
        description: `Schedule ${scheduleId.substring(0, 8)} has been cancelled. Unvested tokens refunded.`,
        timestamp: Date.now(),
        read: false,
        type: "warning",
      };
      setNotifications((prev) => [notification, ...prev]);
    }
  };

  const emergencyWithdraw = (tokenAddress: string, amount: number) => {
    // Add log
    const log: ActivityLog = {
      id: Date.now().toString(),
      type: "withdraw",
      beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      tokenSymbol: "Tokens",
      amount,
      timestamp: Date.now(),
      txHash: `0x${Math.floor(Math.random() * 1e32).toString(16)}`,
    };
    setLogs((prev) => [log, ...prev]);

    // Add notification
    const notification: Notification = {
      id: Date.now().toString(),
      title: "Emergency Withdrawal Triggered",
      description: `Withdrew ${amount.toLocaleString()} tokens from reserve contract balance.`,
      timestamp: Date.now(),
      read: false,
      type: "warning",
    };
    setNotifications((prev) => [notification, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(schedules, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AetherVesting_Export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <VestingContext.Provider
      value={{
        schedules,
        logs,
        notifications,
        isDemoMode,
        setIsDemoMode,
        activeTab,
        setActiveTab,
        viewingScheduleId,
        setViewingScheduleId,
        walletHealthScore,
        riskIndicator,
        createSchedule,
        claimTokens,
        claimAllTokens,
        revokeSchedule,
        emergencyWithdraw,
        markAllNotificationsRead,
        exportData,
      }}
    >
      {children}
    </VestingContext.Provider>
  );
};
