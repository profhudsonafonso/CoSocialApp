"use client"

import Image from "next/image"
import { useState } from "react"
import { ImageIcon } from "lucide-react"

interface FeatureCardVisualProps {
  src: string
  alt: string
}

export function FeatureCardVisual({ src, alt }: FeatureCardVisualProps) {
  const [hasImageError, setHasImageError] = useState(false)

  return (
    <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-3 shadow-xl shadow-primary/10">
      {!hasImageError ? (
        <div className="relative aspect-[4/3] w-full max-w-[620px]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 620px"
            className="object-contain"
            onError={() => setHasImageError(true)}
          />
        </div>
      ) : (
        <div className="relative aspect-[4/3] w-full max-w-[620px]">
          <Image
            src="/placeholder.svg"
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 620px"
            className="object-contain opacity-30"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/30 bg-background/70 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ImageIcon className="h-8 w-8" />
            </div>
            <p className="mt-5 text-sm font-semibold text-foreground">Imagem do módulo não encontrada</p>
          </div>
        </div>
      )}
    </div>
  )
}
