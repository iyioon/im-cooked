"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UserPreferences } from "@/types/recipe";
import {
  loadPreferences,
  savePreferences,
  getDefaultPreferences,
} from "@/lib/preferences-manager";
import { X, MapPin, Plus } from "lucide-react";

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMON_DIETARY_RESTRICTIONS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "keto",
  "paleo",
  "low-carb",
  "low-sodium",
  "halal",
  "kosher",
];

const COMMON_ALLERGIES = [
  "peanuts",
  "tree nuts",
  "shellfish",
  "fish",
  "eggs",
  "dairy",
  "soy",
  "wheat",
  "sesame",
];

const COMMON_CUISINES = [
  "Italian",
  "Asian",
  "Mexican",
  "American",
  "Mediterranean",
  "French",
  "Indian",
  "Thai",
  "Japanese",
  "Chinese",
];

const COMMON_EQUIPMENT = [
  "oven",
  "air fryer",
  "instant pot",
  "slow cooker",
  "microwave",
  "grill",
  "stand mixer",
  "food processor",
];

export function PreferencesDialog({
  open,
  onOpenChange,
}: PreferencesDialogProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    getDefaultPreferences()
  );

  // Custom input states
  const [customDietary, setCustomDietary] = useState("");
  const [customAllergy, setCustomAllergy] = useState("");
  const [customCuisine, setCustomCuisine] = useState("");
  const [customAvoid, setCustomAvoid] = useState("");

  useEffect(() => {
    const loaded = loadPreferences();
    if (loaded) {
      setPreferences(loaded);
    }
  }, [open]);

  const handleSave = () => {
    savePreferences(preferences);
    onOpenChange(false);
  };

  const toggleArrayItem = (
    key: keyof UserPreferences,
    item: string
  ): void => {
    const current = (preferences[key] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];

    setPreferences({ ...preferences, [key]: updated });
  };

  const addCustomItem = (key: keyof UserPreferences, value: string) => {
    if (!value.trim()) return;
    const current = (preferences[key] as string[]) || [];
    if (!current.includes(value.trim())) {
      setPreferences({ ...preferences, [key]: [...current, value.trim()] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            Recipe Preferences
          </DialogTitle>
          <DialogDescription>
            Set your location and dietary preferences to get more relevant
            recipe suggestions and substitutions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Location */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Location & Regional
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Country</label>
                  <Input
                    placeholder="e.g., United States"
                    value={preferences.location?.country || ""}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        location: {
                          ...preferences.location,
                          country: e.target.value,
                        },
                      })
                    }
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">
                    Region/State
                  </label>
                  <Input
                    placeholder="e.g., California"
                    value={preferences.location?.region || ""}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        location: {
                          ...preferences.location,
                          region: e.target.value,
                        },
                      })
                    }
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400">
                  Measurement System
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={
                      preferences.measurementSystem === "metric"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        measurementSystem: "metric",
                      })
                    }
                    className={
                      preferences.measurementSystem === "metric"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "border-white/20 hover:bg-white/10"
                    }
                  >
                    Metric (g, ml)
                  </Button>
                  <Button
                    type="button"
                    variant={
                      preferences.measurementSystem === "imperial"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        measurementSystem: "imperial",
                      })
                    }
                    className={
                      preferences.measurementSystem === "imperial"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "border-white/20 hover:bg-white/10"
                    }
                  >
                    Imperial (cups, oz)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dietary Restrictions */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Dietary Restrictions
              </h3>

              <div className="flex flex-wrap gap-2">
                {COMMON_DIETARY_RESTRICTIONS.map((diet) => (
                  <Badge
                    key={diet}
                    onClick={() =>
                      toggleArrayItem("dietaryRestrictions", diet)
                    }
                    className={
                      preferences.dietaryRestrictions?.includes(diet)
                        ? "bg-green-500/20 text-green-400 border-green-500/50 cursor-pointer"
                        : "bg-white/5 text-gray-400 border-white/10 cursor-pointer hover:bg-white/10"
                    }
                  >
                    {diet}
                  </Badge>
                ))}
                {preferences.dietaryRestrictions
                  ?.filter((d) => !COMMON_DIETARY_RESTRICTIONS.includes(d))
                  .map((diet) => (
                    <Badge
                      key={diet}
                      className="bg-green-500/20 text-green-400 border-green-500/50 cursor-pointer"
                      onClick={() =>
                        toggleArrayItem("dietaryRestrictions", diet)
                      }
                    >
                      {diet} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom restriction"
                  value={customDietary}
                  onChange={(e) => setCustomDietary(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCustomItem("dietaryRestrictions", customDietary);
                      setCustomDietary("");
                    }
                  }}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    addCustomItem("dietaryRestrictions", customDietary);
                    setCustomDietary("");
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Allergies</h3>

              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((allergy) => (
                  <Badge
                    key={allergy}
                    onClick={() => toggleArrayItem("allergies", allergy)}
                    className={
                      preferences.allergies?.includes(allergy)
                        ? "bg-red-500/20 text-red-400 border-red-500/50 cursor-pointer"
                        : "bg-white/5 text-gray-400 border-white/10 cursor-pointer hover:bg-white/10"
                    }
                  >
                    {allergy}
                  </Badge>
                ))}
                {preferences.allergies
                  ?.filter((a) => !COMMON_ALLERGIES.includes(a))
                  .map((allergy) => (
                    <Badge
                      key={allergy}
                      className="bg-red-500/20 text-red-400 border-red-500/50 cursor-pointer"
                      onClick={() => toggleArrayItem("allergies", allergy)}
                    >
                      {allergy} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom allergy"
                  value={customAllergy}
                  onChange={(e) => setCustomAllergy(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCustomItem("allergies", customAllergy);
                      setCustomAllergy("");
                    }
                  }}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    addCustomItem("allergies", customAllergy);
                    setCustomAllergy("");
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preferred Cuisines */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Preferred Cuisines
              </h3>

              <div className="flex flex-wrap gap-2">
                {COMMON_CUISINES.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    onClick={() => toggleArrayItem("preferredCuisines", cuisine)}
                    className={
                      preferences.preferredCuisines?.includes(cuisine)
                        ? "bg-purple-500/20 text-purple-400 border-purple-500/50 cursor-pointer"
                        : "bg-white/5 text-gray-400 border-white/10 cursor-pointer hover:bg-white/10"
                    }
                  >
                    {cuisine}
                  </Badge>
                ))}
                {preferences.preferredCuisines
                  ?.filter((c) => !COMMON_CUISINES.includes(c))
                  .map((cuisine) => (
                    <Badge
                      key={cuisine}
                      className="bg-purple-500/20 text-purple-400 border-purple-500/50 cursor-pointer"
                      onClick={() =>
                        toggleArrayItem("preferredCuisines", cuisine)
                      }
                    >
                      {cuisine} <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom cuisine"
                  value={customCuisine}
                  onChange={(e) => setCustomCuisine(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCustomItem("preferredCuisines", customCuisine);
                      setCustomCuisine("");
                    }
                  }}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    addCustomItem("preferredCuisines", customCuisine);
                    setCustomCuisine("");
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cooking Preferences */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Cooking Preferences
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Skill Level</label>
                  <div className="flex gap-2">
                    {["beginner", "intermediate", "advanced"].map((level) => (
                      <Button
                        key={level}
                        type="button"
                        size="sm"
                        variant={
                          preferences.skillLevel === level
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            skillLevel: level as any,
                          })
                        }
                        className={
                          preferences.skillLevel === level
                            ? "bg-blue-600 hover:bg-blue-700 text-xs"
                            : "border-white/20 hover:bg-white/10 text-xs"
                        }
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">
                    Default Servings
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={preferences.defaultServings || 4}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        defaultServings: parseInt(e.target.value) || 4,
                      })
                    }
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avoided Ingredients */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Avoided Ingredients (Dislikes)
              </h3>

              <div className="flex flex-wrap gap-2">
                {preferences.avoidedIngredients?.map((ingredient) => (
                  <Badge
                    key={ingredient}
                    className="bg-orange-500/20 text-orange-400 border-orange-500/50 cursor-pointer"
                    onClick={() =>
                      toggleArrayItem("avoidedIngredients", ingredient)
                    }
                  >
                    {ingredient} <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add ingredient to avoid"
                  value={customAvoid}
                  onChange={(e) => setCustomAvoid(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCustomItem("avoidedIngredients", customAvoid);
                      setCustomAvoid("");
                    }
                  }}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    addCustomItem("avoidedIngredients", customAvoid);
                    setCustomAvoid("");
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-white/20 hover:bg-white/10 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
