import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkflowTemplate, WorkflowStage } from '../../types';
import { Button } from '../ui/Button';
import { 
  X, 
  Plus, 
  Copy, 
  Trash2, 
  Layers, 
  Clock, 
  Check, 
  Save, 
  Lock,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface WorkflowTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowTemplateManagerModal: React.FC<WorkflowTemplateManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    workflowTemplates, 
    createWorkflowTemplate, 
    updateWorkflowTemplate, 
    duplicateWorkflowTemplate, 
    deleteWorkflowTemplate 
  } = useApp();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(workflowTemplates[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('Wedding');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  const selectedTemplate = workflowTemplates.find(t => t.id === selectedTemplateId) || workflowTemplates[0];

  if (!isOpen) return null;

  const handleCreateNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const created = createWorkflowTemplate({
      name: newTemplateName.trim(),
      category: newTemplateCategory,
      description: newTemplateDesc.trim() || undefined,
      stages: selectedTemplate ? JSON.parse(JSON.stringify(selectedTemplate.stages)) : [],
      taskTemplates: [],
      isActive: true,
      isDefault: false
    });

    setIsCreatingNew(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
    if (created?.id) setSelectedTemplateId(created.id);
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateWorkflowTemplate(id);
    if (dup?.id) setSelectedTemplateId(dup.id);
  };

  const handleDelete = (template: WorkflowTemplate) => {
    if (template.isDefault) {
      alert('Standard default templates cannot be deleted.');
      return;
    }
    if (confirm(`Delete workflow template "${template.name}"?`)) {
      deleteWorkflowTemplate(template.id);
      setSelectedTemplateId(workflowTemplates[0]?.id || '');
    }
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;
    const stages = [...selectedTemplate.stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const temp = stages[index];
    stages[index] = stages[targetIndex];
    stages[targetIndex] = temp;

    // Reassign orders
    stages.forEach((s, idx) => { s.order = idx + 1; });
    updateWorkflowTemplate(selectedTemplate.id, { stages });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-6 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Photography Production Workflow Templates
              </h3>
              <p className="text-xs text-zinc-500">
                Configure production pipelines, stages, required approvals and stage durations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Templates List Sidebar */}
          <div className="md:col-span-4 border-r border-zinc-200 pr-0 md:pr-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Templates</span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + New Template
              </button>
            </div>

            {isCreatingNew && (
              <form onSubmit={handleCreateNewSubmit} className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Template Name..."
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-200 bg-white"
                />
                <select
                  value={newTemplateCategory}
                  onChange={e => setNewTemplateCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-200 bg-white"
                >
                  <option value="Wedding">Wedding</option>
                  <option value="Pre-Wedding">Pre-Wedding</option>
                  <option value="Corporate Event">Corporate Event</option>
                  <option value="Product Photography">Product Photography</option>
                </select>
                <div className="flex justify-end gap-1.5">
                  <Button size="xs" variant="outline" type="button" onClick={() => setIsCreatingNew(false)}>Cancel</Button>
                  <Button size="xs" variant="primary" type="submit">Create</Button>
                </div>
              </form>
            )}

            <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
              {workflowTemplates.map(tmpl => {
                const isSelected = tmpl.id === selectedTemplate?.id;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' : 'bg-white border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate">{tmpl.name}</span>
                      {tmpl.isDefault && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          Default
                        </span>
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {tmpl.stages.length} Stages • {tmpl.category || 'General'}
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-zinc-200/20" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(tmpl.id)}
                        className={`hover:underline text-xs ${isSelected ? 'text-zinc-300' : 'text-zinc-600'}`}
                      >
                        Duplicate
                      </button>
                      {!tmpl.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDelete(tmpl)}
                          className="hover:underline text-xs text-rose-500"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Stages Editor (8 cols) */}
          <div className="md:col-span-8 space-y-4">
            {selectedTemplate ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{selectedTemplate.name}</h4>
                    <p className="text-xs text-zinc-500">{selectedTemplate.description || 'Configured production stages'}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                    {selectedTemplate.stages.length} Stages Configured
                  </span>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {selectedTemplate.stages.map((stage, idx) => (
                    <div
                      key={stage.id}
                      className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-xs gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {stage.order}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 truncate">{stage.name}</div>
                          <div className="text-xs text-zinc-500">
                            {stage.department} • {stage.estimatedHours} hrs {stage.requiresApproval ? '• Approval Required' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, 'up')}
                          className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                          title="Move stage earlier"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-zinc-600" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedTemplate.stages.length - 1}
                          onClick={() => handleMoveStage(idx, 'down')}
                          className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                          title="Move stage later"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-zinc-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-zinc-400 text-xs">Select a template on the left.</div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
