"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type BadgeDef = { id: string; label: string; earned: boolean }

export function MicroCredentialBadges() {
  const [wallet, setWallet] = useState<string>("")
  const [badges, setBadges] = useState<BadgeDef[]>([
    { id: "skill-data-cleaning", label: "Data Cleaning", earned: true },
    { id: "skill-sql-queries", label: "SQL Queries", earned: false },
    { id: "skill-ml-basics", label: "ML Basics", earned: false },
  ])

  const issueBadge = (id: string) => {
    setBadges((prev) => prev.map((b) => (b.id === id ? { ...b, earned: true } : b)))
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Input
          placeholder="Blockchain wallet address (demo)"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          When you complete a skill cluster, a verifiable credential can be issued to your wallet.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <Badge key={b.id} variant={b.earned ? "default" : "outline"}>
            {b.label} {b.earned ? "• Earned" : ""}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        {badges
          .filter((b) => !b.earned)
          .map((b) => (
            <Button key={b.id} size="sm" onClick={() => issueBadge(b.id)}>
              Issue “{b.label}”
            </Button>
          ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Note: This is a local demo. Wallet linking and on-chain issuance can be added later.
      </div>
    </div>
  )
}
