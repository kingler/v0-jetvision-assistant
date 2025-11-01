/**
 * Simple verification script for ChatKit installation
 * ONEK-84: Install ChatKit Dependencies
 *
 * This script verifies that @openai/chatkit-react is properly installed
 * and can be imported.
 */

async function verifyChatkitInstallation(): Promise<void> {
  console.log('🔍 Verifying ChatKit installation...\n');

  try {
    // Test 1: Import ChatKit React
    console.log('✓ Test 1: Importing @openai/chatkit-react...');
    const chatkitReact = await import('@openai/chatkit-react');
    console.log('  ✅ Successfully imported @openai/chatkit-react');
    console.log(`  - ChatKit component: ${typeof chatkitReact.ChatKit}`);
    console.log(`  - useChatKit hook: ${typeof chatkitReact.useChatKit}`);

    // Test 2: Check ChatKit Core exists (skip import due to export config)
    console.log('\n✓ Test 2: Checking @openai/chatkit package exists...');
    const fs = await import('fs');
    const path = await import('path');
    const chatkitCorePath = path.join(process.cwd(), 'node_modules/@openai/chatkit');
    if (fs.existsSync(chatkitCorePath)) {
      console.log('  ✅ @openai/chatkit package found');
    } else {
      throw new Error('@openai/chatkit package not found');
    }

    // Test 3: Check package versions
    console.log('\n✓ Test 3: Checking package versions...');

    const chatkitReactPkg = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'node_modules/@openai/chatkit-react/package.json'),
        'utf-8'
      )
    );

    const chatkitPkg = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'node_modules/@openai/chatkit/package.json'),
        'utf-8'
      )
    );

    console.log(`  ✅ @openai/chatkit-react@${chatkitReactPkg.version}`);
    console.log(`  ✅ @openai/chatkit@${chatkitPkg.version}`);

    // Test 4: Check package.json entry
    console.log('\n✓ Test 4: Checking package.json entry...');
    const projectPkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
    );

    if (projectPkg.dependencies['@openai/chatkit-react']) {
      console.log(
        `  ✅ @openai/chatkit-react listed in dependencies: ${projectPkg.dependencies['@openai/chatkit-react']}`
      );
    } else {
      throw new Error('@openai/chatkit-react not found in package.json dependencies');
    }

    console.log('\n✅ All verification tests passed!');
    console.log('\n📦 ChatKit installation verified successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyChatkitInstallation();
