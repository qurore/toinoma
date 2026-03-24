"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUBJECTS,
  DIFFICULTIES,
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
} from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

export interface SetMetadata {
  title: string;
  description: string;
  subject: Subject | "";
  difficulty: Difficulty | "";
  price: number;
  timeLimitMinutes: number | null;
  coverImageUrl: string;
  university: string;
}

interface SetMetadataFormProps {
  metadata: SetMetadata;
  onChange: (metadata: SetMetadata) => void;
}

export function SetMetadataForm({ metadata, onChange }: SetMetadataFormProps) {
  function update(patch: Partial<SetMetadata>) {
    onChange({ ...metadata, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="set-title">タイトル *</Label>
        <Input
          id="set-title"
          value={metadata.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="例: 2024年度 東大数学 第1問〜第6問"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="set-description">説明</Label>
        <Textarea
          id="set-description"
          value={metadata.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          placeholder="問題セットの概要や対象レベルなど"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-subject">教科 *</Label>
          <Select
            value={metadata.subject}
            onValueChange={(val) => update({ subject: val as Subject })}
          >
            <SelectTrigger id="set-subject">
              <SelectValue placeholder="教科を選択" />
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SUBJECT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="set-difficulty">難易度 *</Label>
          <Select
            value={metadata.difficulty}
            onValueChange={(val) => update({ difficulty: val as Difficulty })}
          >
            <SelectTrigger id="set-difficulty">
              <SelectValue placeholder="難易度を選択" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-university">大学名</Label>
          <Input
            id="set-university"
            value={metadata.university}
            onChange={(e) => update({ university: e.target.value })}
            placeholder="例: 東京大学"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="set-price">価格（円）</Label>
          <Input
            id="set-price"
            type="number"
            min="0"
            step="100"
            value={metadata.price}
            onChange={(e) =>
              update({ price: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
            placeholder="0（無料）"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-time-limit">制限時間（分）</Label>
          <Input
            id="set-time-limit"
            type="number"
            min="0"
            step="5"
            value={metadata.timeLimitMinutes ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              update({
                timeLimitMinutes: val ? parseInt(val, 10) || null : null,
              });
            }}
            placeholder="未設定"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="set-cover-image">カバー画像URL</Label>
          <Input
            id="set-cover-image"
            value={metadata.coverImageUrl}
            onChange={(e) => update({ coverImageUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
}
