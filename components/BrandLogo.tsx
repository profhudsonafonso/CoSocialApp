import { cn } from "@/lib/utils"

interface BrandLogoProps {
  className?: string
  imageClassName?: string
  showText?: boolean
}

export function BrandLogo({
  className,
  imageClassName,
  showText = true,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/brand/colabsocial-logo.png"
        alt="ColabSocial by Out_off_D_Box"
        className={cn("h-8 w-8 rounded-md object-contain", imageClassName)}
      />
      {showText && (
        <span className="font-bold text-foreground">ColabSocial</span>
      )}
    </span>
  )
}
