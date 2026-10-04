import React from 'react';
import { ResourceItem } from '../types';
import { ResourceSandboxModal } from './ResourceSandboxModal';

export interface ResourceViewerProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ResourceViewer Component
 * Dedicated viewer modal for published resources and interactive HTML simulations.
 */
export const ResourceViewer: React.FC<ResourceViewerProps> = ({
  resource,
  isOpen,
  onClose
}) => {
  return (
    <ResourceSandboxModal
      resource={resource}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default ResourceViewer;
