import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { store } from "@/lib/store";
import type { Analysis } from "@/lib/analysis";

export function SaveAnalysisModal({
  analysis,
  open,
  onOpenChange,
}: {
  analysis: Analysis;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [name, setName] = useState(analysis.name);
  const [tags, setTags] = useState<string[]>(analysis.tags);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState(analysis.notes);

  useEffect(() => {
    if (open) {
      setName(analysis.saved ? analysis.name : `${analysis.name} - ${new Date().toLocaleString("en", { month: "long", year: "numeric" })}`);
      setTags(analysis.tags);
      setNotes(analysis.notes);
    }
  }, [open, analysis]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/,/g, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save analysis</DialogTitle>
          <DialogDescription>Saved analyses appear under Saved and can be compared later.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            store.update(analysis.id, { name: name.trim(), tags, notes, saved: true });
            toast.success("Analysis saved");
            onOpenChange(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="an-name">Analysis name</Label>
            <Input id="an-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="an-tags">Tags</Label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="an-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder={tags.length ? "" : "customer, support…"}
                className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="an-notes">Notes</Label>
            <Textarea id="an-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" rows={3} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
