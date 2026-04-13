
import { useEditorContext } from '../contexts/EditorContext';
// Re-export types from context for backward compatibility or ease of use
export type { EditorState, EditorActions } from '../contexts/EditorContext';

export const useEditorState = () => {
    return useEditorContext();
};
