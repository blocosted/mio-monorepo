"use client";

import { BookOpen, MapPin, Sparkles, User, Users } from "lucide-react";

import { Badge } from "@mio/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@mio/ui/card";

interface StoryCharacter {
  name: string;
  description: string;
  voiceType?: string;
}

interface StorySetting {
  location: string;
  era: string;
  ambiance: string;
}

interface EnrichedConcept {
  title: string;
  mainCharacter: StoryCharacter;
  secondaryCharacters?: StoryCharacter[];
  setting: StorySetting;
  tone: string;
  themes: string[];
  synopsis?: string;
}

interface ScriptMetadata {
  title?: string;
  targetDuration?: number;
  actualDuration?: number;
  wordCount?: number;
  voiceSegmentCount?: number;
  sfxSegmentCount?: number;
}

interface ConceptPhaseOutput {
  enrichedConcept: EnrichedConcept;
  script: {
    metadata?: ScriptMetadata;
    characters?: Array<{
      characterName: string;
      voiceId?: string;
      voiceDescription: string;
    }>;
  };
}

interface ConceptOutputProps {
  output: ConceptPhaseOutput;
}

export function ConceptOutput({ output }: ConceptOutputProps) {
  const { enrichedConcept, script } = output;

  return (
    <div className="space-y-4">
      {/* Story Concept */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {enrichedConcept.title}
          </CardTitle>
          {enrichedConcept.synopsis && (
            <CardDescription>{enrichedConcept.synopsis}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Themes */}
          {enrichedConcept.themes.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Themes</p>
              <div className="flex flex-wrap gap-2">
                {enrichedConcept.themes.map((theme) => (
                  <Badge key={theme} variant="secondary">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tone */}
          {enrichedConcept.tone && (
            <div>
              <p className="text-sm font-medium">Tone</p>
              <p className="text-sm capitalize text-muted-foreground">
                {enrichedConcept.tone}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Character */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Main Character
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{enrichedConcept.mainCharacter.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {enrichedConcept.mainCharacter.description}
          </p>
          {enrichedConcept.mainCharacter.voiceType && (
            <Badge variant="outline" className="mt-2">
              Voice: {enrichedConcept.mainCharacter.voiceType}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Secondary Characters */}
      {enrichedConcept.secondaryCharacters &&
        enrichedConcept.secondaryCharacters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Secondary Characters ({enrichedConcept.secondaryCharacters.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enrichedConcept.secondaryCharacters.map((character, index) => (
                <div
                  key={index}
                  className={index > 0 ? "border-t pt-3" : ""}
                >
                  <p className="font-medium">{character.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {character.description}
                  </p>
                  {character.voiceType && (
                    <Badge variant="outline" className="mt-2">
                      Voice: {character.voiceType}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      {/* Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Setting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm font-medium">Location</p>
            <p className="text-sm text-muted-foreground">
              {enrichedConcept.setting.location}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Era</p>
            <p className="text-sm text-muted-foreground">
              {enrichedConcept.setting.era}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Ambiance</p>
            <p className="text-sm text-muted-foreground">
              {enrichedConcept.setting.ambiance}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Script Metadata */}
      {script?.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Script Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              {script.metadata.wordCount && (
                <div>
                  <dt className="text-muted-foreground">Words</dt>
                  <dd className="font-medium">{script.metadata.wordCount}</dd>
                </div>
              )}
              {script.metadata.voiceSegmentCount !== undefined && (
                <div>
                  <dt className="text-muted-foreground">Voice Segments</dt>
                  <dd className="font-medium">{script.metadata.voiceSegmentCount}</dd>
                </div>
              )}
              {script.metadata.sfxSegmentCount !== undefined && (
                <div>
                  <dt className="text-muted-foreground">SFX</dt>
                  <dd className="font-medium">{script.metadata.sfxSegmentCount}</dd>
                </div>
              )}
              {script.characters && (
                <div>
                  <dt className="text-muted-foreground">Characters</dt>
                  <dd className="font-medium">{script.characters.length}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
