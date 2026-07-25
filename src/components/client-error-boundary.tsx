"use client";

import React from "react";
import { reportClientError } from "@/lib/client-error";

type Props = {
  children: React.ReactNode;
  /** Non-technical fallback when a child throws. Never shows error.message. */
  fallback?: React.ReactNode;
  scope?: string;
};

type State = { hasError: boolean };

export class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportClientError(this.props.scope ?? "react-boundary", {
      error,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
