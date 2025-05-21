export default function BackgroundDecoration() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-radial from-primary/5 to-transparent" />
      <div className="absolute bottom-0 right-0 w-full h-64 bg-gradient-radial from-secondary/5 to-transparent" />
      <div className="absolute top-1/4 right-10 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-1/4 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
    </div>
  )
}
