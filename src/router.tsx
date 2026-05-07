/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/home/HomePage';
import HomeUi from './pages/home/homeUi';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeUi />,
  },
  {
    path: "/original",
    element: <HomePage />,
  },
]);

export default router;