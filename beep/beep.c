#include <windows.h>

#include <stdio.h>
#include <string.h>

static DWORD char2DWORD( char c ) {
  if( c < '1' ) return 1;
  if( c > '9' ) return 9;
  return c - '0';
}

int main( void ) {
  while( 1 ) {
    char line[10] = { 0 };

    fgets( line, sizeof( line ), stdin );

    if( strstr( line, "beep" ) == line ) {
      DWORD freq = char2DWORD( line[4] ) * 1000;
      DWORD ms = char2DWORD( line[5] ) * 100;

      printf( "%s\n", "Beep ON" ); fflush( stdout );
      Beep( freq, ms );
      printf( "%s\n", "Beep OFF" ); fflush( stdout );
    }
  }

  return 0;
}
