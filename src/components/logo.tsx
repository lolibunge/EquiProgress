import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3.5 10.5c2.5-2 5.5-4 8.5-4s6 2 8.5 4" />
    <path d="M12 4.5v15" />
    <path d="M4 11.5c-1.5 2-2.5 4.5-2.5 7.5" />
    <path d="M20 11.5c1.5 2 2.5 4.5 2.5 7.5" />
    <path d="M12 11.5a2.5 2.5 0 0 0-2.5 2.5c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5A2.5 2.5 0 0 0 12 11.5z" />
  </svg>
);