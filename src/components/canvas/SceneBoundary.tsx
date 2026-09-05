"use client";
import React from "react";
import { AlertCircle } from "lucide-react";

interface Props { children: React.ReactNode }
interface State { error: Error | null }

/**
 * WebGL is the least reliable thing on the page: no GPU, a lost context, a
 * driver quirk, a blocked asset. None of that should cost the user their plan,
 * so a failure here degrades to a message and leaves the rest of the canvas
 * (shopping list, 2D view, render) working.
 */
export class SceneBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("3D scene failed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card grid h-[560px] place-items-center p-8 text-center">
          <div className="max-w-sm">
            <AlertCircle className="mx-auto h-6 w-6 text-brass" />
            <div className="mt-4 font-display text-2xl">The 3D view could not start.</div>
            <p className="mt-2 text-[13px] leading-relaxed text-ash">
              This usually means the browser has no WebGL available. The 2D top view and the
              render both still work, and your layout is unaffected.
            </p>
            <button onClick={() => this.setState({ error: null })} className="btn btn-ghost mt-5 text-xs">
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
