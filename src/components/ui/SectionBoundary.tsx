import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

/**
 * SectionBoundary — a lightweight error boundary for individual landing-page
 * sections. If a single section crashes (e.g. a Supabase query throws), the
 * rest of the page keeps rendering instead of going to a blank white screen.
 */
export class SectionBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`SectionBoundary[${this.props.name ?? 'section'}]:`, error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
