import DiffMatchPatch, { patch_obj } from "diff-match-patch";

export type VersionID = string;

export type Version = {
  id: VersionID;
  date: string;
  patch: (new () => patch_obj)[];
  parent: VersionID | null;
};

export function createVersion(
  oldText: string,
  newText: string,
  parent: VersionID | null
): Version {
  const id = crypto.randomUUID();
  const date = Date.now().toString();
  const dmp = new DiffMatchPatch();
  const patch = dmp.patch_make(oldText, newText);
  return {
    id,
    date,
    patch,
    parent,
  };
}

export function compileTextFromVersions(versions: Version[]): string {
  const dmp = new DiffMatchPatch();
  const patches = versions.flatMap((version) => version.patch);
  const [ret, results] = dmp.patch_apply(patches, "");
  for (let i = 0; i < results.length; i++) {
    if (!results[i]) {
      throw new Error(`Failed to apply patch ${i}`);
    }
  }
  return ret;
}

function getLastPatch(allVersions: Map<VersionID, Version>): string {
  const leavesIds = getLeaves(allVersions);
  const longestLeaves = getLongestBranchLeaf(leavesIds, allVersions).map(
    (leafId) => allVersions.get(leafId)!
  );
  longestLeaves.sort((a, b) => (a.date < b.date ? 1 : -1));
  return longestLeaves.pop()!.id;
}

function getLeaves(allVersions: Map<VersionID, Version>): Set<VersionID> {
  const leaves: Set<VersionID> = new Set();
  const seen: Set<VersionID> = new Set();
  allVersions.forEach((version, id) => {
    if (seen.has(id)) return;
    if (version.parent) {
      seen.add(version.parent);
      leaves.delete(version.parent);
    }
    leaves.add(id);
  });
  return leaves;
}

function getLongestBranchLeaf(
  leaves: Set<VersionID>,
  versions: Map<VersionID, Version>
): VersionID[] {
  const rootDistanceByVersion: Map<VersionID, number> = new Map();
  let maxDistance = 0;
  const leafDistances: { leaf: VersionID; distance: number }[] = [];

  for (const leaf of Array.from(leaves)) {
    const distance = getVersionRootDistance(
      leaf,
      rootDistanceByVersion,
      versions
    );
    leafDistances.push({ leaf, distance });
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  }
  return leafDistances
    .filter((ld) => ld.distance === maxDistance)
    .map((ld) => ld.leaf);
}

function getVersionRootDistance(
  versionId: VersionID,
  rootDistanceByVersion: Map<VersionID, number>,
  allVersions: Map<VersionID, Version>
): number {
  if (rootDistanceByVersion.has(versionId)) {
    return rootDistanceByVersion.get(versionId)!;
  }
  const version = allVersions.get(versionId);
  if (!version) throw Error(`Version not found: ${versionId}`);
  if (!version.parent) {
    rootDistanceByVersion.set(versionId, 0);
    return 0;
  }
  const distance =
    getVersionRootDistance(version.parent, rootDistanceByVersion, allVersions) +
    1;
  rootDistanceByVersion.set(versionId, distance);
  return distance;
}

/**
 * Get complete main branch, down to the root. The main branch is defined by
 * the length of the branch, and the age of the latest version (in that order
 * of priority).
 * @returns Array of versions, from root to the latest "main" version.
 */
export function getMainBranch(allVersions: Map<VersionID, Version>): Version[] {
  let leaf: VersionID | null = getLastPatch(allVersions);
  if (!leaf) return [];
  const ret = getBranch(leaf, allVersions);
  return ret;
}

/**
 * Get complete branch starting from a given version, down to the root.
 * @param version Version to start the branch from.
 * @returns Array of versions, from root to the given version.
 */
export function getBranch(
  version: VersionID,
  allVersions: Map<VersionID, Version>
): Version[] {
  const ret: Version[] = [];
  let currentVersion: VersionID | null = version;
  while (currentVersion) {
    const version = allVersions.get(currentVersion);
    if (!version)
      throw Error("Version not found while walking main version branch");
    ret.push(version);
    currentVersion = version.parent;
  }
  ret.reverse();
  return ret;
}
