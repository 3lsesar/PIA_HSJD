import Image from "next/image"

interface HospitalLogoProps {
  width?: number
  height?: number
  className?: string
}

export default function HospitalLogo({ width = 150, height = 60, className = "" }: HospitalLogoProps) {
  return (
    <div className={className}>
      <Image
        src="/hsjd.png"
        alt="Hospital Sant Joan de Déu"
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </div>
  )
}
