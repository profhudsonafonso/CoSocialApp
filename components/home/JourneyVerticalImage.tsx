import Image from "next/image"

export function JourneyVerticalImage() {
  return (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center overflow-hidden rounded-[28px] border border-border bg-card/90 p-3 shadow-xl shadow-primary/10">
      <Image
        src="/home/cosocial-journey-vertical.png"
        alt="Jornada CoSocial da ideia à startup"
        width={724}
        height={2172}
        sizes="(max-width: 768px) 260px, (max-width: 1280px) 280px, 320px"
        className="h-full max-h-[560px] w-auto max-w-full object-contain"
      />
    </div>
  )
}
