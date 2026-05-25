import React from 'react';
import { StoreProvider } from '../workdrive/store.jsx';
import WorkDriveApp from '../workdrive/WorkDriveApp.jsx';

// HRMS route page that hosts the WorkDrive team-file workspace.
// The signed-in HRMS user is passed through so the WorkDrive backend can
// resolve their identity and Team Folder roles.
export default function WorkDrive({ user }) {
  return (
    <StoreProvider user={user}>
      <WorkDriveApp />
    </StoreProvider>
  );
}
