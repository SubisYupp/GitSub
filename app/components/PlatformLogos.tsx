'use client';

// Codeforces logo - bar chart style
export function CodeforcesLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 7.5A1.5 1.5 0 0 1 6 9v10.5a1.5 1.5 0 0 1-3 0V9a1.5 1.5 0 0 1 1.5-1.5zm6-4.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-3 0v-15a1.5 1.5 0 0 1 1.5-1.5zm6 9a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-3 0v-6a1.5 1.5 0 0 1 1.5-1.5z"/>
    </svg>
  );
}

// LeetCode logo - simplified bracket style
export function LeetCodeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.645 1.837-.645s1.357.195 1.823.662l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.055 5.055 0 0 0-2.445-1.337l2.467-2.503c.516-.514.498-1.366-.037-1.901-.535-.535-1.387-.552-1.902-.038l-10.1 10.101c-.981.982-1.494 2.337-1.494 3.835 0 1.498.513 2.895 1.494 3.875l4.347 4.361c.981.979 2.337 1.452 3.834 1.452s2.853-.512 3.835-1.494l2.609-2.637c.514-.514.496-1.365-.039-1.9s-1.386-.553-1.899-.039zM20.811 13.01H10.666c-.702 0-1.27.604-1.27 1.346s.568 1.346 1.27 1.346h10.145c.701 0 1.27-.604 1.27-1.346s-.569-1.346-1.27-1.346z"/>
    </svg>
  );
}

// AtCoder logo - stylized A
export function AtCoderLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6L7 18H9.5L10.5 15H13.5L14.5 18H17L12 6ZM11.25 13L12 10.5L12.75 13H11.25Z" fill="currentColor"/>
    </svg>
  );
}

// CodeChef logo - chef hat
export function CodeChefLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.007.004c-.3.008-.595.022-.875.042C6.69.35 4.032 2.024 2.855 4.63c-.218.481-.394 1-.518 1.55-.278 1.235-.268 2.58.03 3.995.278 1.322.762 2.587 1.396 3.717.34.605.72 1.178 1.134 1.71.37.475.768.917 1.196 1.324v.003l.006.006c.16.152.325.3.493.443V21.5a.5.5 0 0 0 .5.5h9.816a.5.5 0 0 0 .5-.5v-4.122c.168-.143.333-.29.493-.443l.006-.006v-.003a11.625 11.625 0 0 0 1.196-1.324c.414-.532.794-1.105 1.135-1.71.633-1.13 1.117-2.395 1.395-3.717.298-1.415.308-2.76.03-3.994a7.728 7.728 0 0 0-.518-1.551c-1.177-2.607-3.835-4.28-7.277-4.584A13.67 13.67 0 0 0 11.007.004zM12 4c2.206 0 4 1.794 4 4s-1.794 4-4 4-4-1.794-4-4 1.794-4 4-4z"/>
    </svg>
  );
}

// Get logo component by platform name
export function getPlatformLogo(platform: string) {
  switch (platform.toLowerCase()) {
    case 'codeforces':
      return CodeforcesLogo;
    case 'leetcode':
      return LeetCodeLogo;
    case 'atcoder':
      return AtCoderLogo;
    case 'codechef':
      return CodeChefLogo;
    default:
      return null;
  }
}

// Platform badge with logo
interface PlatformBadgeProps {
  platform: string;
  showText?: boolean;
  className?: string;
}

export function PlatformBadge({ platform, showText = true, className = '' }: PlatformBadgeProps) {
  const Logo = getPlatformLogo(platform);
  
  const platformColors: Record<string, string> = {
    codeforces: 'text-blue-400',
    leetcode: 'text-orange-400',
    atcoder: 'text-emerald-400',
    codechef: 'text-amber-400',
  };
  
  const platformNames: Record<string, string> = {
    codeforces: 'Codeforces',
    leetcode: 'LeetCode',
    atcoder: 'AtCoder',
    codechef: 'CodeChef',
  };
  
  const color = platformColors[platform.toLowerCase()] || 'text-zinc-400';
  const name = platformNames[platform.toLowerCase()] || platform;
  
  return (
    <span className={`inline-flex items-center gap-1.5 ${color} ${className}`}>
      {Logo && <Logo className="w-4 h-4" />}
      {showText && <span>{name}</span>}
    </span>
  );
}
