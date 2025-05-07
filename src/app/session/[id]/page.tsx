// src/app/session/[id]/page.tsx

import { useParams } from 'next/navigation';

const SessionInputPage = () => {
  const { id } = useParams();

  return (
    <div>
      Session Input for ID: {id}
    </div>
  );
};

export default SessionInputPage;