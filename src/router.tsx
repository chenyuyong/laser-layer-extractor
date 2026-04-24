/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/home/HomePage';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
]);

export default router;