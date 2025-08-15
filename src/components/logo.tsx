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
    <path d="M12,2 C6.5,2 2,6.5 2,12 C2,17.5 6.5,22 12,22 C17.5,22 22,17.5 22,12 C22,6.5 17.5,2 12,2 Z" />
    <path d="M15.5,8.5 A2,2 0 0,1 17.5,10.5 A2,2 0 0,1 15.5,12.5 A2,2 0 0,1 13.5,10.5 A2,2 0 0,1 15.5,8.5 Z" />
    <path d="M8.5,15.5 L15.5,8.5" />
  </svg>
);
