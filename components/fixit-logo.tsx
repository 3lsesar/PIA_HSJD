import Image from "next/image"

interface FixITLogoProps {
  width?: number
  height?: number
  className?: string
}

export default function FixITLogo({ width = 150, height = 150, className = "" }: FixITLogoProps) {
  return (
    <div className={className}>
      <Image
        src="/fixit-logo.png"
        alt="FixIT - Assistent tècnic"
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </div>
  )
}
