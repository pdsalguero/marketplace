export function Card({ className = "", children }) {
  return <div className={"bg-white border border-gray-200 rounded-2xl shadow-sm " + className}>{children}</div>;
}
export function CardHeader({ className = "", children }) {
  return <div className={"px-5 pt-5 " + className}>{children}</div>;
}
export function CardTitle({ className = "", children }) {
  return <h2 className={"text-lg sm:text-xl font-semibold tracking-tight " + className}>{children}</h2>;
}
export function CardContent({ className = "", children }) {
  return <div className={"px-5 pb-5 " + className}>{children}</div>;
}
export function CardFooter({ className = "", children }) {
  return <div className={"px-5 pb-5 pt-2 " + className}>{children}</div>;
}
