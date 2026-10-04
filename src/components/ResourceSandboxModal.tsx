import React from 'react';
import { ResourceViewer, ResourceViewerProps } from './ResourceViewer';

export type ResourceSandboxModalProps = ResourceViewerProps;

/**
 * ResourceSandboxModal
 * Re-exports the unified ResourceViewer component to maintain 100% backward compatibility
 * across all existing pages and modals.
 */
export const ResourceSandboxModal: React.FC<ResourceViewerProps> = (props) => {
  return <ResourceViewer {...props} />;
};

export default ResourceSandboxModal;
