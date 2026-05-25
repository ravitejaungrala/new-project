import React from 'react';
import './workdrive.css';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Toolbar from './components/Toolbar.jsx';
import Explorer from './components/Explorer.jsx';
import Modals from './components/Modals.jsx';
import MembersDrawer from './components/MembersDrawer.jsx';
import Toast from './components/Toast.jsx';

// The WorkDrive workspace, embedded as a module inside the NeuzenAI HRMS shell.
// `.wd-root` scopes every Tailwind utility (see tailwind.config.js) and sizes
// the module to fit inside the host page container.
export default function WorkDriveApp() {
  return (
    <div className="wd-root">
      <div className="flex h-full w-full min-w-0 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <Toolbar />
          <Explorer />
        </div>
      </div>
      <Modals />
      <MembersDrawer />
      <Toast />
    </div>
  );
}
