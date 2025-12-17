
'use client';

import Image from 'next/image';

// Platform logo image paths
const platformLogoUrls: Record<string, string> = {
  codeforces: '/logos/codeforces.png',
  leetcode: '/logos/leetcode.png',
  atcoder: '/logos/atcoder.png',
  codechef: '/logos/codechef.png',
};

// Codeforces official logo - three rising bars (blue, red, yellow)
export function CodeforcesLogo({ className }: { className?: string }) {
  return (
    <Image 
      src="/logos/codeforces.png" 
      alt="Codeforces" 
      width={24} 
      height={24} 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// LeetCode official logo
export function LeetCodeLogo({ className }: { className?: string }) {
  return (
    <Image 
      src="/logos/leetcode.png" 
      alt="LeetCode" 
      width={24} 
      height={24} 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// AtCoder official logo
export function AtCoderLogo({ className }: { className?: string }) {
  return (
    <Image 
      src="/logos/atcoder.png" 
      alt="AtCoder" 
      width={24} 
      height={24} 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// CodeChef official logo
export function CodeChefLogo({ className }: { className?: string }) {
  return (
    <Image 
      src="/logos/codechef.png" 
      alt="CodeChef" 
      width={24} 
      height={24} 
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Generic platform logo component that uses images
export function PlatformLogoImage({ platform, width = 120, height = 40, className = '' }: {
  platform: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const logoUrl = platformLogoUrls[platform.toLowerCase()];
  if (!logoUrl) return null;

  return (
    <Image
      src={logoUrl}
      alt={platform}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
    />
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
