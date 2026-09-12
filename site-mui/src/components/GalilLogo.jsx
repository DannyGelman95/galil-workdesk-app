export default function GalilLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" aria-hidden="true">
      <path
        d="M78 34H42a10 10 0 00-10 10v152a10 10 0 0010 10h36"
        fill="none"
        stroke="#1F3D24"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M162 34h36a10 10 0 0110 10v152a10 10 0 01-10 10h-36"
        fill="none"
        stroke="#1F3D24"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M148 92A44 44 0 10152 148V122H122"
        fill="none"
        stroke="#8CC63E"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
