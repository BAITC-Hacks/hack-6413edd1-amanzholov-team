import React, { useEffect, useState } from 'react';
import { PixelButton } from '../common/PixelButton';
import { Plus, X } from 'lucide-react';

interface AddSkillModalProps {
  isOpen: boolean;
  catalogSkills: { id: string; name: string }[];
  initialSkillId?: string;
  onClose: () => void;
  onAddSkill: (skill: { skill_id: string; level: number; evidence: string }) => Promise<void>;
}

export const AddSkillModal: React.FC<AddSkillModalProps> = ({
  isOpen, catalogSkills, initialSkillId, onClose, onAddSkill,
}) => {
  const [skillId, setSkillId] = useState('');
  const [level, setLevel] = useState(2);
  const [evidence, setEvidence] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSkillId(initialSkillId || '');
      setLevel(2);
      setEvidence('');
      setError('');
    }
  }, [isOpen, initialSkillId]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!skillId || evidence.trim().length < 3 || pending) return;
    setPending(true);
    setError('');
    try {
      await onAddSkill({ skill_id: skillId, level, evidence: evidence.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not submit the skill for review. Please retry.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="skill-modal-title" className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-[#241d18] border-2 border-[#b88235] p-4 rounded-xs shadow-[0_0_24px_rgba(184,130,53,0.35)]">
        <div className="flex items-center justify-between pb-2 border-b border-[#4d3a2a]">
          <h3 id="skill-modal-title" className="font-pixel text-sm text-[#fae5b6] font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> SUBMIT SKILL EVIDENCE</h3>
          <button aria-label="Close" disabled={pending} onClick={onClose} className="text-[#aa9887] p-1"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="py-3 space-y-3">
          <div>
            <label htmlFor="catalog-skill" className="block text-xs font-pixel text-[#ded1c0] mb-1">Skill from catalog</label>
            <select id="catalog-skill" required disabled={pending} value={skillId} onChange={(event) => setSkillId(event.target.value)} className="w-full px-2.5 py-2 bg-[#191411] border border-[#523e2d] rounded-xs text-sm text-[#faf0e3]">
              <option value="">Select a skill</option>
              {catalogSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
            {!catalogSkills.length && <p className="text-xs text-[#f5a798] mt-1">No skills are available in the catalog.</p>}
          </div>
          <fieldset disabled={pending}>
            <legend className="text-xs font-pixel text-[#ded1c0] mb-1">Self-assessed proficiency ({level}/5)</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-pressed={value === level} onClick={() => setLevel(value)} className={`flex-1 py-2 text-xs font-mono font-bold rounded-xs border ${level >= value ? 'bg-[#d69539] border-[#fad58c] text-[#241505]' : 'bg-[#191411] border-[#4a3727] text-[#7d6c5c]'}`}>{value}</button>)}
            </div>
          </fieldset>
          <div>
            <label htmlFor="skill-evidence" className="block text-xs font-pixel text-[#ded1c0] mb-1">Evidence / project reference</label>
            <textarea id="skill-evidence" required minLength={3} maxLength={4000} rows={3} disabled={pending} placeholder="Describe your work and provide evidence for the reviewer..." value={evidence} onChange={(event) => setEvidence(event.target.value)} className="w-full px-2.5 py-2 bg-[#191411] border border-[#523e2d] rounded-xs text-xs text-[#faf0e3]" />
          </div>
          <p className="text-xs text-[#baa897]">Your claim will be reviewed. Verified proficiency changes after approval.</p>
          {error && <p role="alert" className="text-xs text-[#f5a798]">{error}</p>}
          <div className="pt-2 flex gap-2">
            <PixelButton variant="primary" fullWidth type="submit" disabled={pending || !skillId || evidence.trim().length < 3}>{pending ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW'}</PixelButton>
            <PixelButton variant="secondary" type="button" disabled={pending} onClick={onClose}>CANCEL</PixelButton>
          </div>
        </form>
      </div>
    </div>
  );
};
