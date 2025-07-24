import Image from "next/image";

export default function TestPage() {
  return (
    <div>
      <h1>Test Image</h1>
      <Image src="/logo.png" alt="Logo" width={200} height={60} />
    </div>
  );
}