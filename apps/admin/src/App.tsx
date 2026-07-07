import { BrowserRouter } from "react-router-dom";

import { AdminConsole } from "./features/admin/AdminConsole";

export function App() {
  return (
    <BrowserRouter basename="/admin">
      <AdminConsole />
    </BrowserRouter>
  );
}
